#pragma once

#include "models.h"
#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>
#include <future>
#include <memory>
#include <vector>
#include <optional>

namespace stp::order {

class OrderRepository {
public:
    explicit OrderRepository(drogon::orm::DbClientPtr dbClient = nullptr);

    // Order operations
    bool createOrder(const Order& order, const std::string& sagaStep, const OutboxMessage& outbox);
    std::optional<Order> getOrderById(const std::string& orderId);
    std::vector<Order> getOrdersByUserId(const std::string& userId, int limit = 50, int offset = 0);
    std::vector<Order> getPendingLimitOrders(int limit = 50);
    bool updateOrderStatus(const std::string& orderId, OrderStatus status, 
                           const std::optional<int64_t>& executionPrice = std::nullopt,
                           const std::optional<int64_t>& totalValue = std::nullopt,
                           const std::string& rejectionReason = "",
                           const std::string& reservationId = "");

    // Trade operations
    bool recordTradeAndExecuteOrder(const Trade& trade, const Order& order, 
                                   const OutboxMessage& orderOutbox, 
                                   const OutboxMessage& tradeOutbox);
    std::vector<Trade> getTradesByUserId(const std::string& userId, int limit = 50, int offset = 0);

    // Idempotency operations
    std::optional<std::pair<int, Json::Value>> checkIdempotency(const std::string& key);
    bool saveIdempotency(const std::string& key, const std::string& userId, 
                        const std::string& orderId, int statusCode, const Json::Value& body);

    // Outbox operations
    bool insertOutboxMessage(const OutboxMessage& outbox);
    std::vector<OutboxMessage> getPendingOutboxMessages(int limit = 50);
    bool markOutboxPublished(const std::string& outboxId);
    bool markOutboxFailed(const std::string& outboxId);

    // Saga operations
    bool updateSagaState(const std::string& sagaId, const std::string& step, 
                         const std::string& status, const std::string& reservationId = "", 
                         const std::string& error = "");

private:
    drogon::orm::DbClientPtr getDbClient() const;
    mutable drogon::orm::DbClientPtr dbClient_;
};

} // namespace stp::order
