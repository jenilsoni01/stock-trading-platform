#pragma once

#include <drogon/HttpController.h>
#include "order_repository.h"

namespace stp::order {

class TradeController : public drogon::HttpController<TradeController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(TradeController::listTrades, "/api/v1/trades", drogon::Get, drogon::Options);
    ADD_METHOD_TO(TradeController::listTrades, "/api/v1/trades/", drogon::Get, drogon::Options);
    METHOD_LIST_END

    void listTrades(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    static void setDependencies(std::shared_ptr<OrderRepository> repository);

private:
    static std::shared_ptr<OrderRepository> repository_;
    std::string extractUserId(const drogon::HttpRequestPtr& req);
};

} // namespace stp::order
