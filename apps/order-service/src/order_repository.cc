#include "order_repository.h"
#include <trantor/utils/Logger.h>
#include <sstream>

namespace stp::order {

OrderRepository::OrderRepository(drogon::orm::DbClientPtr dbClient)
    : dbClient_(std::move(dbClient)) {}

drogon::orm::DbClientPtr OrderRepository::getDbClient() const {
    if (dbClient_) return dbClient_;
    dbClient_ = drogon::app().getDbClient("default");
    return dbClient_;
}

bool OrderRepository::createOrder(const Order& order, const std::string& sagaStep, const OutboxMessage& outbox) {
    try {
        // Insert order
        std::string sqlOrder = "INSERT INTO orders (order_id, user_id, symbol, side, order_type, quantity, "
                               "limit_price_paise, status, rejection_reason, reservation_id, idempotency_key) "
                               "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        auto fOrder = getDbClient()->execSqlAsyncFuture(
            sqlOrder,
            order.orderId,
            order.userId,
            order.symbol,
            orderSideToString(order.side),
            orderTypeToString(order.type),
            order.quantity,
            order.limitPricePaise.has_value() ? static_cast<int64_t>(*order.limitPricePaise) : 0,
            orderStatusToString(order.status),
            order.rejectionReason,
            order.reservationId,
            order.idempotencyKey
        );
        fOrder.get();

        // Insert saga record
        std::string sqlSaga = "INSERT INTO sagas (saga_id, order_id, user_id, current_step, status) "
                              "VALUES (?, ?, ?, ?, ?)";
        auto fSaga = getDbClient()->execSqlAsyncFuture(
            sqlSaga,
            drogon::utils::getUuid(),
            order.orderId,
            order.userId,
            sagaStep,
            "STARTED"
        );
        fSaga.get();

        // Insert outbox message
        Json::StreamWriterBuilder writer;
        std::string payloadStr = Json::writeString(writer, outbox.payload);

        std::string sqlOutbox = "INSERT INTO outbox_messages (outbox_id, event_id, event_type, aggregate_type, "
                                "aggregate_id, correlation_id, event_version, payload, status) "
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')";
        auto fOutbox = getDbClient()->execSqlAsyncFuture(
            sqlOutbox,
            outbox.outboxId,
            outbox.eventId,
            outbox.eventType,
            outbox.aggregateType,
            outbox.aggregateId,
            outbox.correlationId,
            outbox.eventVersion,
            payloadStr
        );
        fOutbox.get();

        return true;
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to create order: " << e.what();
        return false;
    }
}

std::optional<Order> OrderRepository::getOrderById(const std::string& orderId) {
    try {
        std::string sql = "SELECT order_id, user_id, symbol, side, order_type, quantity, "
                          "limit_price_paise, execution_price_paise, total_value_paise, "
                          "status, rejection_reason, reservation_id, idempotency_key, "
                          "created_at, updated_at FROM orders WHERE order_id = ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, orderId);
        auto result = f.get();

        if (result.empty()) {
            return std::nullopt;
        }

        auto row = result[0];
        Order o;
        o.orderId = row["order_id"].as<std::string>();
        o.userId = row["user_id"].as<std::string>();
        o.symbol = row["symbol"].as<std::string>();
        o.side = orderSideFromString(row["side"].as<std::string>());
        o.type = orderTypeFromString(row["order_type"].as<std::string>());
        o.quantity = row["quantity"].as<int>();
        
        if (!row["limit_price_paise"].isNull() && row["limit_price_paise"].as<int64_t>() > 0) {
            o.limitPricePaise = row["limit_price_paise"].as<int64_t>();
        }
        if (!row["execution_price_paise"].isNull() && row["execution_price_paise"].as<int64_t>() > 0) {
            o.executionPricePaise = row["execution_price_paise"].as<int64_t>();
        }
        if (!row["total_value_paise"].isNull() && row["total_value_paise"].as<int64_t>() > 0) {
            o.totalValuePaise = row["total_value_paise"].as<int64_t>();
        }

        o.status = orderStatusFromString(row["status"].as<std::string>());
        if (!row["rejection_reason"].isNull()) {
            o.rejectionReason = row["rejection_reason"].as<std::string>();
        }
        if (!row["reservation_id"].isNull()) {
            o.reservationId = row["reservation_id"].as<std::string>();
        }
        if (!row["idempotency_key"].isNull()) {
            o.idempotencyKey = row["idempotency_key"].as<std::string>();
        }
        o.createdAt = row["created_at"].as<std::string>();
        o.updatedAt = row["updated_at"].as<std::string>();

        return o;
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to get order: " << e.what();
        return std::nullopt;
    }
}

std::vector<Order> OrderRepository::getOrdersByUserId(const std::string& userId, int limit, int offset) {
    std::vector<Order> orders;
    try {
        std::string sql = "SELECT order_id, user_id, symbol, side, order_type, quantity, "
                          "limit_price_paise, execution_price_paise, total_value_paise, "
                          "status, rejection_reason, reservation_id, idempotency_key, "
                          "created_at, updated_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, userId, limit, offset);
        auto result = f.get();

        for (const auto& row : result) {
            Order o;
            o.orderId = row["order_id"].as<std::string>();
            o.userId = row["user_id"].as<std::string>();
            o.symbol = row["symbol"].as<std::string>();
            o.side = orderSideFromString(row["side"].as<std::string>());
            o.type = orderTypeFromString(row["order_type"].as<std::string>());
            o.quantity = row["quantity"].as<int>();
            
            if (!row["limit_price_paise"].isNull() && row["limit_price_paise"].as<int64_t>() > 0) {
                o.limitPricePaise = row["limit_price_paise"].as<int64_t>();
            }
            if (!row["execution_price_paise"].isNull() && row["execution_price_paise"].as<int64_t>() > 0) {
                o.executionPricePaise = row["execution_price_paise"].as<int64_t>();
            }
            if (!row["total_value_paise"].isNull() && row["total_value_paise"].as<int64_t>() > 0) {
                o.totalValuePaise = row["total_value_paise"].as<int64_t>();
            }

            o.status = orderStatusFromString(row["status"].as<std::string>());
            if (!row["rejection_reason"].isNull()) {
                o.rejectionReason = row["rejection_reason"].as<std::string>();
            }
            if (!row["reservation_id"].isNull()) {
                o.reservationId = row["reservation_id"].as<std::string>();
            }
            if (!row["idempotency_key"].isNull()) {
                o.idempotencyKey = row["idempotency_key"].as<std::string>();
            }
            o.createdAt = row["created_at"].as<std::string>();
            o.updatedAt = row["updated_at"].as<std::string>();

            orders.push_back(o);
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to get orders by user: " << e.what();
    }
    return orders;
}

bool OrderRepository::updateOrderStatus(const std::string& orderId, OrderStatus status, 
                                        const std::optional<int64_t>& executionPrice,
                                        const std::optional<int64_t>& totalValue,
                                        const std::string& rejectionReason,
                                        const std::string& reservationId) {
    try {
        std::string sql = "UPDATE orders SET status = ?, "
                          "execution_price_paise = CASE WHEN ? > 0 THEN ? ELSE execution_price_paise END, "
                          "total_value_paise = CASE WHEN ? > 0 THEN ? ELSE total_value_paise END, "
                          "rejection_reason = CASE WHEN ? != '' THEN ? ELSE rejection_reason END, "
                          "reservation_id = CASE WHEN ? != '' THEN ? ELSE reservation_id END "
                          "WHERE order_id = ?";
        
        int64_t execPriceVal = executionPrice.value_or(0);
        int64_t totalVal = totalValue.value_or(0);

        auto f = getDbClient()->execSqlAsyncFuture(
            sql,
            orderStatusToString(status),
            execPriceVal, execPriceVal,
            totalVal, totalVal,
            rejectionReason, rejectionReason,
            reservationId, reservationId,
            orderId
        );
        f.get();
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to update order status: " << e.what();
        return false;
    }
}

bool OrderRepository::recordTradeAndExecuteOrder(const Trade& trade, const Order& order, 
                                                const OutboxMessage& orderOutbox, 
                                                const OutboxMessage& tradeOutbox) {
    try {
        // Update Order to EXECUTED
        std::string sqlUpdateOrder = "UPDATE orders SET status = 'EXECUTED', execution_price_paise = ?, total_value_paise = ? WHERE order_id = ?";
        auto f1 = getDbClient()->execSqlAsyncFuture(sqlUpdateOrder, 
            static_cast<int64_t>(trade.pricePaise), 
            static_cast<int64_t>(trade.totalValuePaise), 
            order.orderId);
        f1.get();

        // Insert Trade
        std::string sqlInsertTrade = "INSERT INTO trades (trade_id, order_id, user_id, symbol, side, quantity, price_paise, total_value_paise) "
                                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        auto f2 = getDbClient()->execSqlAsyncFuture(sqlInsertTrade,
            trade.tradeId,
            trade.orderId,
            trade.userId,
            trade.symbol,
            orderSideToString(trade.side),
            trade.quantity,
            static_cast<int64_t>(trade.pricePaise),
            static_cast<int64_t>(trade.totalValuePaise));
        f2.get();

        // Insert Outbox for Order
        Json::StreamWriterBuilder writer;
        std::string orderPayload = Json::writeString(writer, orderOutbox.payload);
        std::string sqlOutbox1 = "INSERT INTO outbox_messages (outbox_id, event_id, event_type, aggregate_type, aggregate_id, correlation_id, event_version, payload, status) "
                                 "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')";
        auto f3 = getDbClient()->execSqlAsyncFuture(sqlOutbox1,
            orderOutbox.outboxId,
            orderOutbox.eventId,
            orderOutbox.eventType,
            orderOutbox.aggregateType,
            orderOutbox.aggregateId,
            orderOutbox.correlationId,
            orderOutbox.eventVersion,
            orderPayload);
        f3.get();

        // Insert Outbox for Trade
        std::string tradePayload = Json::writeString(writer, tradeOutbox.payload);
        auto f4 = getDbClient()->execSqlAsyncFuture(sqlOutbox1,
            tradeOutbox.outboxId,
            tradeOutbox.eventId,
            tradeOutbox.eventType,
            tradeOutbox.aggregateType,
            tradeOutbox.aggregateId,
            tradeOutbox.correlationId,
            tradeOutbox.eventVersion,
            tradePayload);
        f4.get();

        return true;
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to record trade and order execution: " << e.what();
        return false;
    }
}

std::vector<Trade> OrderRepository::getTradesByUserId(const std::string& userId, int limit, int offset) {
    std::vector<Trade> trades;
    try {
        std::string sql = "SELECT trade_id, order_id, user_id, symbol, side, quantity, price_paise, "
                          "total_value_paise, executed_at FROM trades WHERE user_id = ? ORDER BY executed_at DESC LIMIT ? OFFSET ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, userId, limit, offset);
        auto result = f.get();

        for (const auto& row : result) {
            Trade t;
            t.tradeId = row["trade_id"].as<std::string>();
            t.orderId = row["order_id"].as<std::string>();
            t.userId = row["user_id"].as<std::string>();
            t.symbol = row["symbol"].as<std::string>();
            t.side = orderSideFromString(row["side"].as<std::string>());
            t.quantity = row["quantity"].as<int>();
            t.pricePaise = row["price_paise"].as<int64_t>();
            t.totalValuePaise = row["total_value_paise"].as<int64_t>();
            t.executedAt = row["executed_at"].as<std::string>();

            trades.push_back(t);
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to get trades: " << e.what();
    }
    return trades;
}

std::optional<std::pair<int, Json::Value>> OrderRepository::checkIdempotency(const std::string& key) {
    if (key.empty()) return std::nullopt;
    try {
        std::string sql = "SELECT status_code, response_body FROM idempotency_records WHERE idempotency_key = ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, key);
        auto result = f.get();

        if (result.empty()) return std::nullopt;

        int statusCode = result[0]["status_code"].as<int>();
        std::string bodyStr = result[0]["response_body"].as<std::string>();

        Json::CharReaderBuilder reader;
        Json::Value jsonBody;
        std::string errs;
        std::istringstream s(bodyStr);
        if (Json::parseFromStream(reader, s, &jsonBody, &errs)) {
            return std::make_pair(statusCode, jsonBody);
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Idempotency check error: " << e.what();
    }
    return std::nullopt;
}

bool OrderRepository::saveIdempotency(const std::string& key, const std::string& userId, 
                                      const std::string& orderId, int statusCode, const Json::Value& body) {
    if (key.empty()) return true;
    try {
        Json::StreamWriterBuilder writer;
        std::string bodyStr = Json::writeString(writer, body);

        std::string sql = "INSERT INTO idempotency_records (idempotency_key, user_id, order_id, response_body, status_code) "
                          "VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE response_body = VALUES(response_body)";
        auto f = getDbClient()->execSqlAsyncFuture(sql, key, userId, orderId, bodyStr, statusCode);
        f.get();
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to save idempotency record: " << e.what();
        return false;
    }
}

std::vector<OutboxMessage> OrderRepository::getPendingOutboxMessages(int limit) {
    std::vector<OutboxMessage> messages;
    try {
        std::string sql = "SELECT outbox_id, event_id, event_type, aggregate_type, aggregate_id, correlation_id, "
                          "causation_id, event_version, payload, retry_count, created_at "
                          "FROM outbox_messages WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, limit);
        auto result = f.get();

        for (const auto& row : result) {
            OutboxMessage m;
            m.outboxId = row["outbox_id"].as<std::string>();
            m.eventId = row["event_id"].as<std::string>();
            m.eventType = row["event_type"].as<std::string>();
            m.aggregateType = row["aggregate_type"].as<std::string>();
            m.aggregateId = row["aggregate_id"].as<std::string>();
            m.correlationId = row["correlation_id"].as<std::string>();
            m.eventVersion = row["event_version"].as<int>();
            
            std::string payloadStr = row["payload"].as<std::string>();
            Json::CharReaderBuilder reader;
            std::istringstream s(payloadStr);
            std::string errs;
            Json::parseFromStream(reader, s, &m.payload, &errs);

            m.retryCount = row["retry_count"].as<int>();
            m.createdAt = row["created_at"].as<std::string>();
            messages.push_back(m);
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to fetch pending outbox messages: " << e.what();
    }
    return messages;
}

bool OrderRepository::markOutboxPublished(const std::string& outboxId) {
    try {
        std::string sql = "UPDATE outbox_messages SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP WHERE outbox_id = ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, outboxId);
        f.get();
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to mark outbox published: " << e.what();
        return false;
    }
}

bool OrderRepository::markOutboxFailed(const std::string& outboxId) {
    try {
        std::string sql = "UPDATE outbox_messages SET retry_count = retry_count + 1, "
                          "status = CASE WHEN retry_count >= 5 THEN 'FAILED' ELSE 'PENDING' END "
                          "WHERE outbox_id = ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, outboxId);
        f.get();
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to mark outbox failed: " << e.what();
        return false;
    }
}

bool OrderRepository::updateSagaState(const std::string& sagaId, const std::string& step, 
                                      const std::string& status, const std::string& reservationId, 
                                      const std::string& error) {
    try {
        std::string sql = "UPDATE sagas SET current_step = ?, status = ?, "
                          "reservation_id = CASE WHEN ? != '' THEN ? ELSE reservation_id END, "
                          "error_message = CASE WHEN ? != '' THEN ? ELSE error_message END "
                          "WHERE order_id = ? OR saga_id = ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, step, status, reservationId, reservationId, error, error, sagaId, sagaId);
        f.get();
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to update saga state: " << e.what();
        return false;
    }
}

} // namespace stp::order
