#include "health_controller.h"

namespace stp::order {

void HealthController::health(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    Json::Value status;
    status["status"] = "UP";
    status["service"] = "order-service";
    auto resp = drogon::HttpResponse::newHttpJsonResponse(status);
    callback(resp);
}

void HealthController::ready(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    Json::Value status;
    status["status"] = "READY";
    status["service"] = "order-service";
    auto resp = drogon::HttpResponse::newHttpJsonResponse(status);
    callback(resp);
}

void HealthController::metrics(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    std::string prometheus = "# HELP stp_order_service_up Status of order service\n"
                             "# TYPE stp_order_service_up gauge\n"
                             "stp_order_service_up 1\n";
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_TEXT_PLAIN);
    resp->setBody(prometheus);
    callback(resp);
}

} // namespace stp::order
