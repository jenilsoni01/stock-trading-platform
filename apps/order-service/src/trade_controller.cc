#include "trade_controller.h"
#include <trantor/utils/Logger.h>

namespace stp::order {

std::shared_ptr<OrderRepository> TradeController::repository_ = nullptr;

void TradeController::setDependencies(std::shared_ptr<OrderRepository> repository) {
    repository_ = std::move(repository);
}

std::string TradeController::extractUserId(const drogon::HttpRequestPtr& req) {
    std::string userId = req->getHeader("X-User-Id");
    if (!userId.empty()) return userId;
    userId = req->getHeader("X-Forwarded-User");
    if (!userId.empty()) return userId;
    return req->getParameter("userId");
}

void TradeController::listTrades(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    if (req->method() == drogon::Options) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->addHeader("Access-Control-Allow-Origin", "*");
        resp->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        resp->addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Id");
        callback(resp);
        return;
    }

    std::string userId = extractUserId(req);

    int limit = 50;
    int offset = 0;
    try {
        if (!req->getParameter("limit").empty()) limit = std::stoi(req->getParameter("limit"));
        if (!req->getParameter("offset").empty()) offset = std::stoi(req->getParameter("offset"));
    } catch (...) {}

    auto trades = repository_->getTradesByUserId(userId, limit, offset);

    Json::Value array(Json::arrayValue);
    for (const auto& t : trades) {
        array.append(t.toJson());
    }

    Json::Value result;
    result["trades"] = array;
    result["count"] = static_cast<int>(trades.size());

    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    resp->addHeader("Access-Control-Allow-Origin", "*");
    callback(resp);
}

} // namespace stp::order
