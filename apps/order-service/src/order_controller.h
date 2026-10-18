#pragma once

#include <drogon/HttpController.h>
#include "saga_orchestrator.h"
#include "order_repository.h"

namespace stp::order {

class OrderController : public drogon::HttpController<OrderController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(OrderController::createOrder, "/api/v1/orders", drogon::Post, drogon::Options);
    ADD_METHOD_TO(OrderController::createOrder, "/api/v1/orders/", drogon::Post, drogon::Options);
    ADD_METHOD_TO(OrderController::listOrders, "/api/v1/orders", drogon::Get, drogon::Options);
    ADD_METHOD_TO(OrderController::listOrders, "/api/v1/orders/", drogon::Get, drogon::Options);
    ADD_METHOD_TO(OrderController::getOrder, "/api/v1/orders/{1}", drogon::Get, drogon::Options);
    ADD_METHOD_TO(OrderController::cancelOrder, "/api/v1/orders/{1}/cancel", drogon::Post, drogon::Options);
    METHOD_LIST_END

    void createOrder(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void listOrders(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getOrder(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& orderId);
    void cancelOrder(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& orderId);

    static void setDependencies(std::shared_ptr<SagaOrchestrator> orchestrator,
                               std::shared_ptr<OrderRepository> repository);

private:
    static std::shared_ptr<SagaOrchestrator> orchestrator_;
    static std::shared_ptr<OrderRepository> repository_;

    std::string extractUserId(const drogon::HttpRequestPtr& req);
};

} // namespace stp::order
