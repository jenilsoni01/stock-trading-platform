#include "order_repository.h"
#include <trantor/utils/Logger.h>
#include <trantor/utils/Date.h>
#include <sstream>

namespace stp::order {

static inline std::string safeDate(const drogon::orm::Row& row, const char* col) {
    if (row[col].isNull()) return "";
    try {
        return row[col].as<std::string>();
    } catch (...) {
        return "";
    }
}

static inline Order parseOrderRow(const drogon::orm::Row& row) {
    Order o;
    try {
        if (!row["order_id"].isNull()) o.orderId = row["order_id"].as<std::string>();
        if (!row["user_id"].isNull()) o.userId = row["user_id"].as<std::string>();
        if (!row["symbol"].isNull()) o.symbol = row["symbol"].as<std::string>();
        if (!row["side"].isNull()) o.side = orderSideFromString(row["side"].as<std::string>());
        if (!row["order_type"].isNull()) o.type = orderTypeFromString(row["order_type"].as<std::string>());
        if (!row["quantity"].isNull()) o.quantity = row["quantity"].as<int>();
        
        if (!row["limit_price_paise"].isNull() && row["limit_price_paise"].as<int64_t>() > 0) {
            o.limitPricePaise = row["limit_price_paise"].as<int64_t>();
        }
        if (!row["execution_price_paise"].isNull() && row["execution_price_paise"].as<int64_t>() > 0) {
            o.executionPricePaise = row["execution_price_paise"].as<int64_t>();
        }
        if (!row["total_value_paise"].isNull() && row["total_value_paise"].as<int64_t>() > 0) {
            o.totalValuePaise = row["total_value_paise"].as<int64_t>();
        }

        if (!row["status"].isNull()) o.status = orderStatusFromString(row["status"].as<std::string>());
        if (!row["rejection_reason"].isNull()) o.rejectionReason = row["rejection_reason"].as<std::string>();
        if (!row["reservation_id"].isNull()) o.reservationId = row["reservation_id"].as<std::string>();
        if (!row["idempotency_key"].isNull()) o.idempotencyKey = row["idempotency_key"].as<std::string>();

        o.createdAt = safeDate(row, "created_at");
        o.updatedAt = safeDate(row, "updated_at");
    } catch (const std::exception& e) {
        LOG_WARN << "parseOrderRow exception: " << e.what();
    }
    return o;
}

static inline Trade parseTradeRow(const drogon::orm::Row& row) {
    Trade t;
    try {
        if (!row["trade_id"].isNull()) t.tradeId = row["trade_id"].as<std::string>();
        if (!row["order_id"].isNull()) t.orderId = row["order_id"].as<std::string>();
        if (!row["user_id"].isNull()) t.userId = row["user_id"].as<std::string>();
        if (!row["symbol"].isNull()) t.symbol = row["symbol"].as<std::string>();
        if (!row["side"].isNull()) t.side = orderSideFromString(row["side"].as<std::string>());
        if (!row["quantity"].isNull()) t.quantity = row["quantity"].as<int>();
        if (!row["price_paise"].isNull()) t.pricePaise = row["price_paise"].as<int64_t>();
        if (!row["total_value_paise"].isNull()) t.totalValuePaise = row["total_value_paise"].as<int64_t>();
        t.executedAt = safeDate(row, "executed_at");
    } catch (const std::exception& e) {
        LOG_WARN << "parseTradeRow exception: " << e.what();
    }
    return t;
}

OrderRepository::OrderRepository(drogon::orm::DbClientPtr dbClient)
    : dbClient_(std::move(dbClient)) {}

drogon::orm::DbClientPtr OrderRepository::getDbClient() const {
    if (dbClient_) return dbClient_;
    dbClient_ = drogon::app().getDbClient("default");
    return dbClient_;
}

void OrderRepository::initSchema() {
    try {
        auto client = getDbClient();
        if (!client) return;

        client->execSqlAsyncFuture(
            "CREATE TABLE IF NOT EXISTS orders ("
            "order_id VARCHAR(36) PRIMARY KEY, "
            "user_id VARCHAR(36) NOT NULL, "
            "symbol VARCHAR(10) NOT NULL, "
            "side ENUM('BUY', 'SELL') NOT NULL, "
            "order_type ENUM('MARKET', 'LIMIT') NOT NULL, "
            "quantity INT NOT NULL CHECK (quantity > 0), "
            "limit_price_paise BIGINT NULL, "
            "execution_price_paise BIGINT NULL, "
            "total_value_paise BIGINT NULL, "
            "status VARCHAR(20) NOT NULL, "
            "rejection_reason TEXT NULL, "
            "reservation_id VARCHAR(36) NULL, "
            "idempotency_key VARCHAR(64) NULL UNIQUE, "
            "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, "
            "INDEX idx_orders_user_id (user_id), "
            "INDEX idx_orders_symbol (symbol), "
            "INDEX idx_orders_status (status), "
            "INDEX idx_orders_created_at (created_at)"
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
        ).get();

        client->execSqlAsyncFuture(
            "CREATE TABLE IF NOT EXISTS trades ("
            "trade_id VARCHAR(36) PRIMARY KEY, "
            "order_id VARCHAR(36) NOT NULL, "
            "user_id VARCHAR(36) NOT NULL, "
            "symbol VARCHAR(10) NOT NULL, "
            "side ENUM('BUY', 'SELL') NOT NULL, "
            "quantity INT NOT NULL CHECK (quantity > 0), "
            "price_paise BIGINT NOT NULL, "
            "total_value_paise BIGINT NOT NULL, "
            "executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
            "INDEX idx_trades_user_id (user_id), "
            "INDEX idx_trades_order_id (order_id), "
            "INDEX idx_trades_symbol (symbol), "
            "INDEX idx_trades_executed_at (executed_at)"
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
        ).get();

        client->execSqlAsyncFuture(
            "CREATE TABLE IF NOT EXISTS outbox_messages ("
            "outbox_id VARCHAR(36) PRIMARY KEY, "
            "event_id VARCHAR(36) NOT NULL UNIQUE, "
            "event_type VARCHAR(64) NOT NULL, "
            "aggregate_type VARCHAR(32) NOT NULL, "
            "aggregate_id VARCHAR(36) NOT NULL, "
            "correlation_id VARCHAR(36) NOT NULL, "
            "causation_id VARCHAR(36) NULL, "
            "event_version INT NOT NULL DEFAULT 1, "
            "payload JSON NOT NULL, "
            "status ENUM('PENDING', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'PENDING', "
            "retry_count INT NOT NULL DEFAULT 0, "
            "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
            "published_at TIMESTAMP NULL, "
            "INDEX idx_outbox_status_created (status, created_at)"
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
        ).get();

        client->execSqlAsyncFuture(
            "CREATE TABLE IF NOT EXISTS idempotency_records ("
            "idempotency_key VARCHAR(64) PRIMARY KEY, "
            "user_id VARCHAR(36) NOT NULL, "
            "order_id VARCHAR(36) NOT NULL, "
            "response_body JSON NOT NULL, "
            "status_code INT NOT NULL, "
            "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
            "INDEX idx_idempotency_user (user_id)"
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
        ).get();

        client->execSqlAsyncFuture(
            "CREATE TABLE IF NOT EXISTS sagas ("
            "saga_id VARCHAR(36) PRIMARY KEY, "
            "order_id VARCHAR(36) NOT NULL, "
            "user_id VARCHAR(36) NOT NULL, "
            "current_step VARCHAR(32) NOT NULL, "
            "status ENUM('STARTED', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED') NOT NULL, "
            "reservation_id VARCHAR(36) NULL, "
            "error_message TEXT NULL, "
            "payload JSON NULL, "
            "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
            "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, "
            "INDEX idx_sagas_order (order_id), "
            "INDEX idx_sagas_status (status)"
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
        ).get();

        LOG_INFO << "Database schema initialized successfully for order-service";
    } catch (const std::exception& e) {
        LOG_WARN << "initSchema notice / warning: " << e.what();
    }
}

bool OrderRepository::createOrder(const Order& order, const std::string& sagaStep, const OutboxMessage& outbox) {
    try {
        // Insert order
        std::string sqlOrder = "INSERT INTO orders (order_id, user_id, symbol, side, order_type, quantity, "
                               "limit_price_paise, status, rejection_reason, reservation_id, idempotency_key) "
                               "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''))";
        
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
                          "COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at, "
                          "COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at "
                          "FROM orders WHERE order_id = ?";
        auto f = getDbClient()->execSqlAsyncFuture(sql, orderId);
        auto result = f.get();

        if (result.empty()) {
            return std::nullopt;
        }

        return parseOrderRow(result[0]);
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to get order: " << e.what();
        return std::nullopt;
    }
}

std::vector<Order> OrderRepository::getOrdersByUserId(const std::string& userId, int limit, int offset) {
    std::vector<Order> orders;
    if (limit <= 0) limit = 50;
    if (offset < 0) offset = 0;
    try {
        std::string sql;
        if (!userId.empty()) {
            sql = "SELECT order_id, user_id, symbol, side, order_type, quantity, "
                  "limit_price_paise, execution_price_paise, total_value_paise, "
                  "status, rejection_reason, reservation_id, idempotency_key, "
                  "COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at, "
                  "COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at "
                  "FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT " + std::to_string(limit) + " OFFSET " + std::to_string(offset);
            auto f = getDbClient()->execSqlAsyncFuture(sql, userId);
            auto result = f.get();
            for (const auto& row : result) {
                orders.push_back(parseOrderRow(row));
            }
        } else {
            sql = "SELECT order_id, user_id, symbol, side, order_type, quantity, "
                  "limit_price_paise, execution_price_paise, total_value_paise, "
                  "status, rejection_reason, reservation_id, idempotency_key, "
                  "COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at, "
                  "COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at "
                  "FROM orders ORDER BY created_at DESC LIMIT " + std::to_string(limit) + " OFFSET " + std::to_string(offset);
            auto f = getDbClient()->execSqlAsyncFuture(sql);
            auto result = f.get();
            for (const auto& row : result) {
                orders.push_back(parseOrderRow(row));
            }
        }

        // Fallback: If no orders found for this specific userId, show platform orders
        if (orders.empty() && !userId.empty()) {
            std::string fallbackSql = "SELECT order_id, user_id, symbol, side, order_type, quantity, "
                                      "limit_price_paise, execution_price_paise, total_value_paise, "
                                      "status, rejection_reason, reservation_id, idempotency_key, "
                                      "COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at, "
                                      "COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at "
                                      "FROM orders ORDER BY created_at DESC LIMIT " + std::to_string(limit);
            auto fFallback = getDbClient()->execSqlAsyncFuture(fallbackSql);
            auto resFallback = fFallback.get();
            for (const auto& row : resFallback) {
                orders.push_back(parseOrderRow(row));
            }
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
    if (limit <= 0) limit = 50;
    if (offset < 0) offset = 0;
    try {
        std::string sql;
        if (!userId.empty()) {
            sql = "SELECT trade_id, order_id, user_id, symbol, side, quantity, price_paise, "
                  "total_value_paise, COALESCE(DATE_FORMAT(executed_at, '%Y-%m-%d %H:%i:%s'), '') AS executed_at "
                  "FROM trades WHERE user_id = ? ORDER BY executed_at DESC LIMIT " + std::to_string(limit) + " OFFSET " + std::to_string(offset);
            auto f = getDbClient()->execSqlAsyncFuture(sql, userId);
            auto result = f.get();
            for (const auto& row : result) {
                trades.push_back(parseTradeRow(row));
            }
        } else {
            sql = "SELECT trade_id, order_id, user_id, symbol, side, quantity, price_paise, "
                  "total_value_paise, COALESCE(DATE_FORMAT(executed_at, '%Y-%m-%d %H:%i:%s'), '') AS executed_at "
                  "FROM trades ORDER BY executed_at DESC LIMIT " + std::to_string(limit) + " OFFSET " + std::to_string(offset);
            auto f = getDbClient()->execSqlAsyncFuture(sql);
            auto result = f.get();
            for (const auto& row : result) {
                trades.push_back(parseTradeRow(row));
            }
        }

        // Fallback: If no trades for specific user, show platform trades
        if (trades.empty() && !userId.empty()) {
            std::string fallbackSql = "SELECT trade_id, order_id, user_id, symbol, side, quantity, price_paise, "
                                      "total_value_paise, COALESCE(DATE_FORMAT(executed_at, '%Y-%m-%d %H:%i:%s'), '') AS executed_at "
                                      "FROM trades ORDER BY executed_at DESC LIMIT " + std::to_string(limit);
            auto fFallback = getDbClient()->execSqlAsyncFuture(fallbackSql);
            auto resFallback = fFallback.get();
            for (const auto& row : resFallback) {
                trades.push_back(parseTradeRow(row));
            }
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
    if (limit <= 0) limit = 50;
    try {
        std::string sql = "SELECT outbox_id, event_id, event_type, aggregate_type, aggregate_id, correlation_id, "
                          "causation_id, event_version, payload, retry_count, "
                          "COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at "
                          "FROM outbox_messages WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT " + std::to_string(limit);
        auto f = getDbClient()->execSqlAsyncFuture(sql);
        auto result = f.get();

        for (const auto& row : result) {
            OutboxMessage m;
            if (!row["outbox_id"].isNull()) m.outboxId = row["outbox_id"].as<std::string>();
            if (!row["event_id"].isNull()) m.eventId = row["event_id"].as<std::string>();
            if (!row["event_type"].isNull()) m.eventType = row["event_type"].as<std::string>();
            if (!row["aggregate_type"].isNull()) m.aggregateType = row["aggregate_type"].as<std::string>();
            if (!row["aggregate_id"].isNull()) m.aggregateId = row["aggregate_id"].as<std::string>();
            if (!row["correlation_id"].isNull()) m.correlationId = row["correlation_id"].as<std::string>();
            if (!row["event_version"].isNull()) m.eventVersion = row["event_version"].as<int>();
            
            if (!row["payload"].isNull()) {
                std::string payloadStr = row["payload"].as<std::string>();
                Json::CharReaderBuilder reader;
                std::istringstream s(payloadStr);
                std::string errs;
                Json::parseFromStream(reader, s, &m.payload, &errs);
            }

            if (!row["retry_count"].isNull()) m.retryCount = row["retry_count"].as<int>();
            m.createdAt = safeDate(row, "created_at");
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

bool OrderRepository::insertOutboxMessage(const OutboxMessage& outbox) {
    try {
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
        LOG_ERROR << "Failed to insert outbox message: " << e.what();
        return false;
    }
}

std::vector<Order> OrderRepository::getPendingLimitOrders(int limit) {
    std::vector<Order> orders;
    if (limit <= 0) limit = 50;
    try {
        std::string sql = "SELECT order_id, user_id, symbol, side, order_type, quantity, "
                          "limit_price_paise, execution_price_paise, total_value_paise, "
                          "status, rejection_reason, reservation_id, idempotency_key, "
                          "COALESCE(DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'), '') AS created_at, "
                          "COALESCE(DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s'), '') AS updated_at "
                          "FROM orders WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT " + std::to_string(limit);
        auto f = getDbClient()->execSqlAsyncFuture(sql);
        auto result = f.get();

        for (const auto& row : result) {
            orders.push_back(parseOrderRow(row));
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Failed to get pending limit orders: " << e.what();
    }
    return orders;
}

} // namespace stp::order
