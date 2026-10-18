#pragma once

#include <string>
#include <vector>
#include <optional>
#include <chrono>
#include <json/json.h>

namespace stp::order {

enum class OrderSide {
    BUY,
    SELL
};

inline std::string orderSideToString(OrderSide side) {
    return side == OrderSide::BUY ? "BUY" : "SELL";
}

inline OrderSide orderSideFromString(const std::string& str) {
    return str == "SELL" ? OrderSide::SELL : OrderSide::BUY;
}

enum class OrderType {
    MARKET,
    LIMIT
};

inline std::string orderTypeToString(OrderType type) {
    return type == OrderType::LIMIT ? "LIMIT" : "MARKET";
}

inline OrderType orderTypeFromString(const std::string& str) {
    return str == "LIMIT" ? OrderType::LIMIT : OrderType::MARKET;
}

enum class OrderStatus {
    CREATED,
    VALIDATING,
    ACCEPTED,
    PENDING,
    EXECUTING,
    EXECUTED,
    REJECTED,
    CANCELLED,
    FAILED
};

inline std::string orderStatusToString(OrderStatus status) {
    switch (status) {
        case OrderStatus::CREATED: return "CREATED";
        case OrderStatus::VALIDATING: return "VALIDATING";
        case OrderStatus::ACCEPTED: return "ACCEPTED";
        case OrderStatus::PENDING: return "PENDING";
        case OrderStatus::EXECUTING: return "EXECUTING";
        case OrderStatus::EXECUTED: return "EXECUTED";
        case OrderStatus::REJECTED: return "REJECTED";
        case OrderStatus::CANCELLED: return "CANCELLED";
        case OrderStatus::FAILED: return "FAILED";
        default: return "UNKNOWN";
    }
}

inline OrderStatus orderStatusFromString(const std::string& str) {
    if (str == "CREATED") return OrderStatus::CREATED;
    if (str == "VALIDATING") return OrderStatus::VALIDATING;
    if (str == "ACCEPTED") return OrderStatus::ACCEPTED;
    if (str == "PENDING") return OrderStatus::PENDING;
    if (str == "EXECUTING") return OrderStatus::EXECUTING;
    if (str == "EXECUTED") return OrderStatus::EXECUTED;
    if (str == "REJECTED") return OrderStatus::REJECTED;
    if (str == "CANCELLED") return OrderStatus::CANCELLED;
    return OrderStatus::FAILED;
}

struct CreateOrderRequest {
    std::string symbol;
    OrderSide side;
    OrderType type;
    int quantity;
    std::optional<int64_t> limitPricePaise;
    std::string idempotencyKey;

    Json::Value toJson() const {
        Json::Value json;
        json["symbol"] = symbol;
        json["side"] = orderSideToString(side);
        json["orderType"] = orderTypeToString(type);
        json["quantity"] = quantity;
        if (limitPricePaise.has_value()) {
            json["limitPricePaise"] = static_cast<Json::Int64>(*limitPricePaise);
        }
        json["idempotencyKey"] = idempotencyKey;
        return json;
    }
};

struct Order {
    std::string orderId;
    std::string userId;
    std::string symbol;
    OrderSide side;
    OrderType type;
    int quantity{0};
    std::optional<int64_t> limitPricePaise;
    std::optional<int64_t> executionPricePaise;
    std::optional<int64_t> totalValuePaise;
    OrderStatus status{OrderStatus::CREATED};
    std::string rejectionReason;
    std::string reservationId;
    std::string idempotencyKey;
    std::string createdAt;
    std::string updatedAt;

    Json::Value toJson() const {
        Json::Value json;
        json["orderId"] = orderId;
        json["userId"] = userId;
        json["symbol"] = symbol;
        json["side"] = orderSideToString(side);
        json["orderType"] = orderTypeToString(type);
        json["quantity"] = quantity;
        if (limitPricePaise.has_value()) {
            json["limitPricePaise"] = static_cast<Json::Int64>(*limitPricePaise);
        } else {
            json["limitPricePaise"] = Json::Value::null;
        }
        if (executionPricePaise.has_value()) {
            json["executionPricePaise"] = static_cast<Json::Int64>(*executionPricePaise);
        } else {
            json["executionPricePaise"] = Json::Value::null;
        }
        if (totalValuePaise.has_value()) {
            json["totalValuePaise"] = static_cast<Json::Int64>(*totalValuePaise);
        } else {
            json["totalValuePaise"] = Json::Value::null;
        }
        json["status"] = orderStatusToString(status);
        if (!rejectionReason.empty()) {
            json["rejectionReason"] = rejectionReason;
        }
        if (!reservationId.empty()) {
            json["reservationId"] = reservationId;
        }
        if (!idempotencyKey.empty()) {
            json["idempotencyKey"] = idempotencyKey;
        }
        json["createdAt"] = createdAt;
        json["updatedAt"] = updatedAt;
        return json;
    }
};

struct Trade {
    std::string tradeId;
    std::string orderId;
    std::string userId;
    std::string symbol;
    OrderSide side;
    int quantity{0};
    int64_t pricePaise{0};
    int64_t totalValuePaise{0};
    std::string executedAt;

    Json::Value toJson() const {
        Json::Value json;
        json["tradeId"] = tradeId;
        json["orderId"] = orderId;
        json["userId"] = userId;
        json["symbol"] = symbol;
        json["side"] = orderSideToString(side);
        json["quantity"] = quantity;
        json["pricePaise"] = static_cast<Json::Int64>(pricePaise);
        json["totalValuePaise"] = static_cast<Json::Int64>(totalValuePaise);
        json["executedAt"] = executedAt;
        return json;
    }
};

struct OutboxMessage {
    std::string outboxId;
    std::string eventId;
    std::string eventType;
    std::string aggregateType;
    std::string aggregateId;
    std::string correlationId;
    std::string causationId;
    int eventVersion{1};
    Json::Value payload;
    std::string status{"PENDING"};
    int retryCount{0};
    std::string createdAt;
    std::string publishedAt;
};

struct QuoteInfo {
    std::string symbol;
    int64_t currentPricePaise{0};
    int64_t previousClosePaise{0};
    int64_t dayHighPaise{0};
    int64_t dayLowPaise{0};
    bool valid{false};
    std::string errorMessage;
};

struct ReservationResult {
    bool success{false};
    std::string reservationId;
    std::string message;
};

} // namespace stp::order
