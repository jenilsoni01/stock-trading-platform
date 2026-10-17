#include "order_controller.h"
#include <trantor/utils/Logger.h>

namespace stp::order {

std::shared_ptr<SagaOrchestrator> OrderController::orchestrator_ = nullptr;
std::shared_ptr<OrderRepository> OrderController::repository_ = nullptr;

void OrderController::setDependencies(std::shared_ptr<SagaOrchestrator> orchestrator,
                                     std::shared_ptr<OrderRepository> repository) {
    orchestrator_ = std::move(orchestrator);
    repository_ = std::move(repository);
}

std::string OrderController::extractUserId(const drogon::HttpRequestPtr& req) {
    // 1. Check for X-User-Id header set by Gateway
    std::string userId = req->getHeader("X-User-Id");
    if (!userId.empty()) return userId;

    // 2. Check X-Forwarded-User header
    userId = req->getHeader("X-Forwarded-User");
    if (!userId.empty()) return userId;

    // 3. Fallback to userId query param or body in dev environment
    userId = req->getParameter("userId");
    if (!userId.empty()) return userId;

    return "";
}

void OrderController::createOrder(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->addHeader("Access-Control-Allow-Origin", "*");
        resp->addHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        resp->addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id, Idempotency-Key");
        callback(resp);
        return;
    }

    std::string userId = extractUserId(req);
    auto jsonPtr = req->getJsonObject();
    if (!jsonPtr) {
        Json::Value err;
        err["error"] = "BAD_REQUEST";
        err["message"] = "Invalid JSON body";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }

    if (userId.empty() && (*jsonPtr).isMember("userId")) {
        userId = (*jsonPtr)["userId"].asString();
    }

    if (userId.empty()) {
        Json::Value err;
        err["error"] = "UNAUTHORIZED";
        err["message"] = "Missing authentication / user identity";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k401Unauthorized);
        callback(resp);
        return;
    }

    CreateOrderRequest orderReq;
    orderReq.symbol = (*jsonPtr).get("symbol", "").asString();
    orderReq.side = orderSideFromString((*jsonPtr).get("side", "BUY").asString());
    orderReq.type = orderTypeFromString((*jsonPtr).get("orderType", "MARKET").asString());
    orderReq.quantity = (*jsonPtr).get("quantity", 0).asInt();
    
    if ((*jsonPtr).isMember("limitPricePaise") && !(*jsonPtr)["limitPricePaise"].isNull()) {
        int64_t lp = (*jsonPtr)["limitPricePaise"].asInt64();
        if (lp > 0) {
            orderReq.limitPricePaise = lp;
        }
    }

    // Check Idempotency key from header or body
    std::string idempotencyKey = req->getHeader("Idempotency-Key");
    if (idempotencyKey.empty()) {
        idempotencyKey = (*jsonPtr).get("idempotencyKey", "").asString();
    }
    orderReq.idempotencyKey = idempotencyKey;

    auto [statusCode, responseBody] = orchestrator_->processOrder(userId, orderReq);

    auto resp = drogon::HttpResponse::newHttpJsonResponse(responseBody);
    resp->setStatusCode(static_cast<drogon::HttpStatusCode>(statusCode));
    resp->addHeader("Access-Control-Allow-Origin", "*");
    callback(resp);
}

void OrderController::listOrders(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->addHeader("Access-Control-Allow-Origin", "*");
        callback(resp);
        return;
    }

    std::string userId = extractUserId(req);
    if (userId.empty()) {
        Json::Value err;
        err["error"] = "UNAUTHORIZED";
        err["message"] = "Missing authentication";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k401Unauthorized);
        callback(resp);
        return;
    }

    int limit = 50;
    int offset = 0;
    try {
        if (!req->getParameter("limit").empty()) limit = std::stoi(req->getParameter("limit"));
        if (!req->getParameter("offset").empty()) offset = std::stoi(req->getParameter("offset"));
    } catch (...) {}

    auto orders = repository_->getOrdersByUserId(userId, limit, offset);

    Json::Value array(Json::arrayValue);
    for (const auto& o : orders) {
        array.append(o.toJson());
    }

    Json::Value result;
    result["orders"] = array;
    result["count"] = static_cast<int>(orders.size());

    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    resp->addHeader("Access-Control-Allow-Origin", "*");
    callback(resp);
}

void OrderController::getOrder(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& orderId) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->addHeader("Access-Control-Allow-Origin", "*");
        callback(resp);
        return;
    }

    std::string userId = extractUserId(req);
    auto optOrder = repository_->getOrderById(orderId);
    if (!optOrder.has_value()) {
        Json::Value err;
        err["error"] = "NOT_FOUND";
        err["message"] = "Order not found";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k404NotFound);
        callback(resp);
        return;
    }

    if (!userId.empty() && optOrder->userId != userId) {
        Json::Value err;
        err["error"] = "FORBIDDEN";
        err["message"] = "Access denied";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k403Forbidden);
        callback(resp);
        return;
    }

    auto resp = drogon::HttpResponse::newHttpJsonResponse(optOrder->toJson());
    resp->addHeader("Access-Control-Allow-Origin", "*");
    callback(resp);
}

void OrderController::cancelOrder(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& orderId) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->addHeader("Access-Control-Allow-Origin", "*");
        callback(resp);
        return;
    }

    std::string userId = extractUserId(req);
    if (userId.empty()) {
        Json::Value err;
        err["error"] = "UNAUTHORIZED";
        err["message"] = "Missing authentication";
        auto resp = drogon::HttpResponse::newHttpJsonResponse(err);
        resp->setStatusCode(drogon::k401Unauthorized);
        callback(resp);
        return;
    }

    auto [statusCode, body] = orchestrator_->cancelOrder(userId, orderId);
    auto resp = drogon::HttpResponse::newHttpJsonResponse(body);
    resp->setStatusCode(static_cast<drogon::HttpStatusCode>(statusCode));
    resp->addHeader("Access-Control-Allow-Origin", "*");
    callback(resp);
}

} // namespace stp::order
