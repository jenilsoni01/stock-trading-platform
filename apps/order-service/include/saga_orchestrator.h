#pragma once

#include "models.h"
#include "order_repository.h"
#include "wallet_client.h"
#include "market_data_client.h"
#include <memory>
#include <utility>

namespace stp::order {

class SagaOrchestrator {
public:
    SagaOrchestrator(std::shared_ptr<OrderRepository> repo,
                     std::shared_ptr<WalletClient> walletClient,
                     std::shared_ptr<MarketDataClient> marketDataClient);

    // Process an order submission through the full distributed saga
    std::pair<int, Json::Value> processOrder(const std::string& userId, const CreateOrderRequest& req);

    // Cancel order
    std::pair<int, Json::Value> cancelOrder(const std::string& userId, const std::string& orderId);

private:
    std::shared_ptr<OrderRepository> repo_;
    std::shared_ptr<WalletClient> walletClient_;
    std::shared_ptr<MarketDataClient> marketDataClient_;

    std::pair<int, Json::Value> executeBuy(const std::string& userId, const CreateOrderRequest& req, const std::string& orderId, const std::string& correlationId);
    std::pair<int, Json::Value> executeSell(const std::string& userId, const CreateOrderRequest& req, const std::string& orderId, const std::string& correlationId);

    OutboxMessage createOutbox(const std::string& eventType, const std::string& aggregateType,
                               const std::string& aggregateId, const std::string& correlationId,
                               const Json::Value& payload);
};

} // namespace stp::order
