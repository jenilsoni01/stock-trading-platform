#include "saga_orchestrator.h"
#include <trantor/utils/Logger.h>
#include <drogon/utils/Utilities.h>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace stp::order {

static std::string getCurrentIsoTime() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

SagaOrchestrator::SagaOrchestrator(std::shared_ptr<OrderRepository> repo,
                                   std::shared_ptr<WalletClient> walletClient,
                                   std::shared_ptr<MarketDataClient> marketDataClient)
    : repo_(std::move(repo)),
      walletClient_(std::move(walletClient)),
      marketDataClient_(std::move(marketDataClient)) {}

OutboxMessage SagaOrchestrator::createOutbox(const std::string& eventType, const std::string& aggregateType,
                                             const std::string& aggregateId, const std::string& correlationId,
                                             const Json::Value& payload) {
    OutboxMessage msg;
    msg.outboxId = drogon::utils::getUuid();
    msg.eventId = drogon::utils::getUuid();
    msg.eventType = eventType;
    msg.aggregateType = aggregateType;
    msg.aggregateId = aggregateId;
    msg.correlationId = correlationId;
    msg.eventVersion = 1;
    msg.payload = payload;
    msg.status = "PENDING";
    return msg;
}

std::pair<int, Json::Value> SagaOrchestrator::processOrder(const std::string& userId, const CreateOrderRequest& req) {
    // 1. Idempotency Check
    if (!req.idempotencyKey.empty()) {
        auto existing = repo_->checkIdempotency(req.idempotencyKey);
        if (existing.has_value()) {
            LOG_INFO << "Returning cached idempotent response for key: " << req.idempotencyKey;
            return *existing;
        }
    }

    // 2. Validate input
    if (req.symbol.empty() || req.quantity <= 0) {
        Json::Value err;
        err["error"] = "INVALID_ORDER";
        err["message"] = "Invalid stock symbol or non-positive quantity";
        return {400, err};
    }

    std::string orderId = drogon::utils::getUuid();
    std::string correlationId = drogon::utils::getUuid();

    if (req.side == OrderSide::BUY) {
        auto res = executeBuy(userId, req, orderId, correlationId);
        if (!req.idempotencyKey.empty()) {
            repo_->saveIdempotency(req.idempotencyKey, userId, orderId, res.first, res.second);
        }
        return res;
    } else {
        auto res = executeSell(userId, req, orderId, correlationId);
        if (!req.idempotencyKey.empty()) {
            repo_->saveIdempotency(req.idempotencyKey, userId, orderId, res.first, res.second);
        }
        return res;
    }
}

std::pair<int, Json::Value> SagaOrchestrator::executeBuy(const std::string& userId, const CreateOrderRequest& req,
                                                         const std::string& orderId, const std::string& correlationId) {
    LOG_INFO << "Starting BUY Saga for user=" << userId << ", symbol=" << req.symbol << ", qty=" << req.quantity;

    // Step 1: Query Market Data for real-time price
    QuoteInfo quote = marketDataClient_->getQuote(req.symbol);
    if (!quote.valid || quote.currentPricePaise <= 0) {
        LOG_WARN << "Quote unavailable or invalid for symbol: " << req.symbol;
        Json::Value err;
        err["error"] = "MARKET_DATA_UNAVAILABLE";
        err["message"] = "Unable to obtain live quote for symbol: " + req.symbol;
        return {400, err};
    }

    int64_t executionPricePaise = quote.currentPricePaise;
    if (req.type == OrderType::LIMIT && req.limitPricePaise.has_value() && *req.limitPricePaise > 0) {
        executionPricePaise = *req.limitPricePaise;
    }
    int64_t estimatedCostPaise = executionPricePaise * req.quantity;

    // Step 2: Initialize Order record (status = VALIDATING)
    Order order;
    order.orderId = orderId;
    order.userId = userId;
    order.symbol = req.symbol;
    order.side = OrderSide::BUY;
    order.type = req.type;
    order.quantity = req.quantity;
    order.limitPricePaise = req.limitPricePaise;
    order.status = OrderStatus::VALIDATING;
    order.idempotencyKey = req.idempotencyKey;

    Json::Value createdPayload = order.toJson();
    createdPayload["estimatedCostPaise"] = static_cast<Json::Int64>(estimatedCostPaise);
    OutboxMessage createdOutbox = createOutbox("orders.created", "Order", orderId, correlationId, createdPayload);

    repo_->createOrder(order, "RESERVE_CASH", createdOutbox);

    // Step 3: Reserve Cash via Wallet Service (ACID pessimistic row lock)
    std::string reservationKey = "order-res-" + orderId;
    ReservationResult resResult = walletClient_->reserveCash(userId, orderId, estimatedCostPaise, reservationKey);

    if (!resResult.success) {
        LOG_WARN << "Cash reservation failed for order " << orderId << ": " << resResult.message;
        
        // Mark order as REJECTED
        repo_->updateOrderStatus(orderId, OrderStatus::REJECTED, std::nullopt, std::nullopt, resResult.message);
        repo_->updateSagaState(orderId, "RESERVE_CASH", "FAILED", "", resResult.message);

        // Outbox event for order rejection
        Json::Value rejectPayload = order.toJson();
        rejectPayload["status"] = "REJECTED";
        rejectPayload["rejectionReason"] = resResult.message;
        OutboxMessage rejectOutbox = createOutbox("orders.rejected", "Order", orderId, correlationId, rejectPayload);
        // Note: outbox message could also be inserted if needed

        Json::Value err;
        err["error"] = "INSUFFICIENT_FUNDS";
        err["message"] = "Cash reservation failed: " + resResult.message;
        err["orderId"] = orderId;
        return {400, err};
    }

    std::string reservationId = resResult.reservationId;
    order.reservationId = reservationId;

    // Step 4: Execute Trade
    if (req.type == OrderType::LIMIT && req.limitPricePaise.has_value() && *req.limitPricePaise > 0) {
        executionPricePaise = *req.limitPricePaise;
    }
    int64_t totalValuePaise = executionPricePaise * req.quantity;

    std::string tradeId = drogon::utils::getUuid();
    Trade trade;
    trade.tradeId = tradeId;
    trade.orderId = orderId;
    trade.userId = userId;
    trade.symbol = req.symbol;
    trade.side = OrderSide::BUY;
    trade.quantity = req.quantity;
    trade.pricePaise = executionPricePaise;
    trade.totalValuePaise = totalValuePaise;
    trade.executedAt = getCurrentIsoTime();

    order.status = OrderStatus::EXECUTED;
    order.executionPricePaise = executionPricePaise;
    order.totalValuePaise = totalValuePaise;

    // Outbox messages for Order Executed and Trade Executed
    Json::Value orderExecPayload = order.toJson();
    OutboxMessage orderExecOutbox = createOutbox("orders.executed", "Order", orderId, correlationId, orderExecPayload);

    Json::Value tradeExecPayload = trade.toJson();
    OutboxMessage tradeExecOutbox = createOutbox("trades.executed", "Trade", tradeId, correlationId, tradeExecPayload);

    // Atomic DB commit of Order EXECUTED + Trade + Outbox records
    repo_->recordTradeAndExecuteOrder(trade, order, orderExecOutbox, tradeExecOutbox);

    // Asynchronously dispatch trade projection to portfolio-service and notification-service
    dispatchTradeEvents(trade, correlationId);

    // Step 5: Capture Cash Reservation (Debit total value, release any remainder)
    bool captured = walletClient_->captureReservation(reservationId, totalValuePaise);
    if (!captured) {
        LOG_WARN << "Capture call returned false for reservation " << reservationId << ", but trade is recorded.";
    }

    repo_->updateSagaState(orderId, "CAPTURE_CASH", "COMPLETED", reservationId);

    // Response
    Json::Value response;
    response["order"] = order.toJson();
    response["trade"] = trade.toJson();
    response["message"] = (req.type == OrderType::LIMIT)
        ? "Limit Buy order executed at specified limit price"
        : "Market Buy order executed at market price";

    LOG_INFO << "BUY order " << orderId << " executed successfully at " << executionPricePaise << " paise";
    return {201, response};
}

std::pair<int, Json::Value> SagaOrchestrator::executeSell(const std::string& userId, const CreateOrderRequest& req,
                                                          const std::string& orderId, const std::string& correlationId) {
    LOG_INFO << "Starting SELL Saga for user=" << userId << ", symbol=" << req.symbol << ", qty=" << req.quantity;

    // Step 1: Query Market Data for real-time price
    QuoteInfo quote = marketDataClient_->getQuote(req.symbol);
    if (!quote.valid || quote.currentPricePaise <= 0) {
        Json::Value err;
        err["error"] = "MARKET_DATA_UNAVAILABLE";
        err["message"] = "Unable to obtain live quote for symbol: " + req.symbol;
        return {400, err};
    }

    int64_t executionPricePaise = quote.currentPricePaise;
    if (req.type == OrderType::LIMIT && req.limitPricePaise.has_value() && *req.limitPricePaise > 0) {
        executionPricePaise = *req.limitPricePaise;
    }
    int64_t totalValuePaise = executionPricePaise * req.quantity;

    // Step 2: Initialize Order record
    Order order;
    order.orderId = orderId;
    order.userId = userId;
    order.symbol = req.symbol;
    order.side = OrderSide::SELL;
    order.type = req.type;
    order.quantity = req.quantity;
    order.limitPricePaise = req.limitPricePaise;
    order.executionPricePaise = executionPricePaise;
    order.totalValuePaise = totalValuePaise;
    order.status = OrderStatus::EXECUTED;
    order.idempotencyKey = req.idempotencyKey;

    std::string tradeId = drogon::utils::getUuid();
    Trade trade;
    trade.tradeId = tradeId;
    trade.orderId = orderId;
    trade.userId = userId;
    trade.symbol = req.symbol;
    trade.side = OrderSide::SELL;
    trade.quantity = req.quantity;
    trade.pricePaise = executionPricePaise;
    trade.totalValuePaise = totalValuePaise;
    trade.executedAt = getCurrentIsoTime();

    // Step 3: Insert initial outbox and execute trade
    Json::Value orderExecPayload = order.toJson();
    OutboxMessage orderExecOutbox = createOutbox("orders.executed", "Order", orderId, correlationId, orderExecPayload);

    Json::Value tradeExecPayload = trade.toJson();
    OutboxMessage tradeExecOutbox = createOutbox("trades.executed", "Trade", tradeId, correlationId, tradeExecPayload);

    repo_->createOrder(order, "CREDIT_CASH", orderExecOutbox);
    repo_->recordTradeAndExecuteOrder(trade, order, orderExecOutbox, tradeExecOutbox);

    // Asynchronously dispatch trade projection to portfolio-service and notification-service
    dispatchTradeEvents(trade, correlationId);

    // Step 4: Credit proceeds to Wallet
    std::string creditKey = "order-credit-" + orderId;
    walletClient_->creditCash(userId, totalValuePaise, orderId, creditKey);

    repo_->updateSagaState(orderId, "CREDIT_CASH", "COMPLETED");

    // Response
    Json::Value response;
    response["order"] = order.toJson();
    response["trade"] = trade.toJson();
    response["message"] = (req.type == OrderType::LIMIT)
        ? "Limit Sell order executed at specified limit price"
        : "Market Sell order executed at market price";

    LOG_INFO << "SELL order " << orderId << " executed successfully at " << executionPricePaise << " paise";
    return {201, response};
}

std::pair<int, Json::Value> SagaOrchestrator::cancelOrder(const std::string& userId, const std::string& orderId) {
    auto optOrder = repo_->getOrderById(orderId);
    if (!optOrder.has_value()) {
        Json::Value err;
        err["error"] = "ORDER_NOT_FOUND";
        err["message"] = "Order not found";
        return {404, err};
    }

    Order order = *optOrder;
    if (order.userId != userId) {
        Json::Value err;
        err["error"] = "FORBIDDEN";
        err["message"] = "You do not have permission to cancel this order";
        return {403, err};
    }

    if (order.status == OrderStatus::EXECUTED || order.status == OrderStatus::CANCELLED || order.status == OrderStatus::REJECTED) {
        Json::Value err;
        err["error"] = "INVALID_STATE";
        err["message"] = "Order cannot be cancelled in state: " + orderStatusToString(order.status);
        return {400, err};
    }

    // Release reservation if present
    if (!order.reservationId.empty()) {
        walletClient_->releaseReservation(order.reservationId);
    }

    repo_->updateOrderStatus(orderId, OrderStatus::CANCELLED);
    repo_->updateSagaState(orderId, "CANCEL", "COMPLETED");

    Json::Value cancelPayload = order.toJson();
    cancelPayload["status"] = "CANCELLED";
    OutboxMessage cancelOutbox = createOutbox("orders.cancelled", "Order", orderId, drogon::utils::getUuid(), cancelPayload);
    // write to outbox
    repo_->createOrder(order, "CANCEL", cancelOutbox);

    Json::Value res;
    res["orderId"] = orderId;
    res["status"] = "CANCELLED";
    res["message"] = "Order successfully cancelled";
    return {200, res};
}

void SagaOrchestrator::dispatchTradeEvents(const Trade& trade, const std::string& correlationId) {
    // 1. Dispatch trade projection to portfolio-service
    std::string portfolioUrl = "http://portfolio-service:8084";
    if (const char* env = std::getenv("PORTFOLIO_SERVICE_URL")) {
        portfolioUrl = env;
    }

    try {
        auto pClient = drogon::HttpClient::newHttpClient(portfolioUrl);
        auto pReq = drogon::HttpRequest::newHttpRequest();
        pReq->setMethod(drogon::Post);
        pReq->setPath("/internal/v1/portfolio/trades");
        pReq->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        Json::StreamWriterBuilder writer;
        pReq->setBody(Json::writeString(writer, trade.toJson()));
        pClient->sendRequest(pReq, [tradeId = trade.tradeId](drogon::ReqResult res, const drogon::HttpResponsePtr& resp) {
            if (res == drogon::ReqResult::Ok && resp && resp->statusCode() == drogon::k200OK) {
                LOG_INFO << "Portfolio trade projection successfully processed for trade: " << tradeId;
            } else {
                LOG_WARN << "Portfolio projection call returned non-200 for trade: " << tradeId;
            }
        }, 3.0);
    } catch (const std::exception& e) {
        LOG_WARN << "Exception dispatching trade to portfolio-service: " << e.what();
    }

    // 2. Dispatch notification event to notification-service
    std::string notifUrl = "http://notification-service:8085";
    if (const char* env = std::getenv("NOTIFICATION_SERVICE_URL")) {
        notifUrl = env;
    }

    try {
        auto nClient = drogon::HttpClient::newHttpClient(notifUrl);
        auto nReq = drogon::HttpRequest::newHttpRequest();
        nReq->setMethod(drogon::Post);
        nReq->setPath("/internal/v1/notifications/events");
        nReq->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        
        Json::Value notifBody;
        notifBody["eventType"] = "trades.executed";
        notifBody["aggregateId"] = trade.tradeId;
        notifBody["correlationId"] = correlationId;
        notifBody["payload"] = trade.toJson();

        Json::StreamWriterBuilder writer;
        nReq->setBody(Json::writeString(writer, notifBody));
        nClient->sendRequest(nReq, [](drogon::ReqResult res, const drogon::HttpResponsePtr& resp) {
            if (res == drogon::ReqResult::Ok) {
                LOG_INFO << "Notification event dispatched successfully";
            }
        }, 3.0);
    } catch (const std::exception& e) {
        LOG_WARN << "Exception dispatching notification: " << e.what();
    }
}

} // namespace stp::order
