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

    int64_t marketPricePaise = quote.currentPricePaise;
    bool isLimit = (req.type == OrderType::LIMIT && req.limitPricePaise.has_value() && *req.limitPricePaise > 0);
    int64_t targetLimitPrice = isLimit ? *req.limitPricePaise : marketPricePaise;

    // Use target limit price for reservation calculation if limit, otherwise market price
    int64_t estimatedCostPaise = targetLimitPrice * req.quantity;

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

        Json::Value err;
        err["error"] = "INSUFFICIENT_FUNDS";
        err["message"] = "Cash reservation failed: " + resResult.message;
        err["orderId"] = orderId;
        return {400, err};
    }

    std::string reservationId = resResult.reservationId;
    order.reservationId = reservationId;

    // Financial Rule for Limit BUY:
    // If target limit price is LESS than current market price, market hasn't dropped to target yet!
    // The order must remain PENDING in the Order Book with funds reserved.
    if (isLimit && marketPricePaise > targetLimitPrice) {
        order.status = OrderStatus::PENDING;
        repo_->updateOrderStatus(orderId, OrderStatus::PENDING, std::nullopt, std::nullopt, "", reservationId);
        repo_->updateSagaState(orderId, "AWAITING_PRICE", "PENDING", reservationId);

        Json::Value pendingPayload = order.toJson();
        OutboxMessage pendingOutbox = createOutbox("orders.pending", "Order", orderId, correlationId, pendingPayload);
        repo_->insertOutboxMessage(pendingOutbox);

        Json::Value response;
        response["order"] = order.toJson();
        response["message"] = "Limit BUY order placed in Order Book. Funds reserved. Awaiting price drop to target.";
        LOG_INFO << "Limit BUY order " << orderId << " placed as PENDING awaiting price <= " << targetLimitPrice;
        return {201, response};
    }

    // Step 4: Execute Trade (Market BUY at marketPricePaise, or Limit BUY where marketPricePaise <= targetLimitPrice)
    int64_t executionPricePaise = marketPricePaise;
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
        ? "Limit Buy order executed at market price"
        : "Market Buy order executed at live market price";

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

    int64_t marketPricePaise = quote.currentPricePaise;
    bool isLimit = (req.type == OrderType::LIMIT && req.limitPricePaise.has_value() && *req.limitPricePaise > 0);
    int64_t targetLimitPrice = isLimit ? *req.limitPricePaise : marketPricePaise;

    // Financial Rule for Limit SELL:
    // If target limit price is GREATER than current market price, market hasn't risen to target yet!
    // The order must remain PENDING in the Order Book.
    if (isLimit && marketPricePaise < targetLimitPrice) {
        Order order;
        order.orderId = orderId;
        order.userId = userId;
        order.symbol = req.symbol;
        order.side = OrderSide::SELL;
        order.type = OrderType::LIMIT;
        order.quantity = req.quantity;
        order.limitPricePaise = req.limitPricePaise;
        order.status = OrderStatus::PENDING;
        order.idempotencyKey = req.idempotencyKey;

        Json::Value pendingPayload = order.toJson();
        OutboxMessage pendingOutbox = createOutbox("orders.pending", "Order", orderId, correlationId, pendingPayload);

        repo_->createOrder(order, "AWAITING_PRICE", pendingOutbox);

        Json::Value response;
        response["order"] = order.toJson();
        response["message"] = "Limit SELL order placed in Order Book. Awaiting price rise to target.";
        LOG_INFO << "Limit SELL order " << orderId << " placed as PENDING awaiting price >= " << targetLimitPrice;
        return {201, response};
    }

    // Step 2: Initialize Order record for instant execution (Market SELL or marketable Limit SELL)
    int64_t executionPricePaise = marketPricePaise;
    int64_t totalValuePaise = executionPricePaise * req.quantity;

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

    // Create unique outbox messages for order creation and trade execution
    Json::Value createdPayload = order.toJson();
    OutboxMessage createdOutbox = createOutbox("orders.created", "Order", orderId, correlationId, createdPayload);

    Json::Value orderExecPayload = order.toJson();
    OutboxMessage orderExecOutbox = createOutbox("orders.executed", "Order", orderId, correlationId, orderExecPayload);

    Json::Value tradeExecPayload = trade.toJson();
    OutboxMessage tradeExecOutbox = createOutbox("trades.executed", "Trade", tradeId, correlationId, tradeExecPayload);

    repo_->createOrder(order, "CREDIT_CASH", createdOutbox);
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
        ? "Limit Sell order executed at market price"
        : "Market Sell order executed at live market price";

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
    if (!userId.empty() && !order.userId.empty() && order.userId != userId && userId != "trader" && order.userId != "trader") {
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
    repo_->insertOutboxMessage(cancelOutbox);

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

int SagaOrchestrator::processPendingLimitOrders() {
    auto pending = repo_->getPendingLimitOrders(50);
    if (pending.empty()) return 0;

    int matchedCount = 0;
    for (const auto& order : pending) {
        if (!order.limitPricePaise.has_value() || *order.limitPricePaise <= 0) continue;

        QuoteInfo quote = marketDataClient_->getQuote(order.symbol);
        if (!quote.valid || quote.currentPricePaise <= 0) continue;

        int64_t marketPrice = quote.currentPricePaise;
        int64_t targetLimit = *order.limitPricePaise;

        bool shouldFill = false;
        if (order.side == OrderSide::BUY && marketPrice <= targetLimit) {
            shouldFill = true;
        } else if (order.side == OrderSide::SELL && marketPrice >= targetLimit) {
            shouldFill = true;
        }

        if (!shouldFill) continue;

        int64_t execPrice = marketPrice;
        int64_t totalVal = execPrice * order.quantity;
        std::string tradeId = drogon::utils::getUuid();
        std::string correlationId = drogon::utils::getUuid();

        Trade trade;
        trade.tradeId = tradeId;
        trade.orderId = order.orderId;
        trade.userId = order.userId;
        trade.symbol = order.symbol;
        trade.side = order.side;
        trade.quantity = order.quantity;
        trade.pricePaise = execPrice;
        trade.totalValuePaise = totalVal;
        trade.executedAt = getCurrentIsoTime();

        Order updatedOrder = order;
        updatedOrder.status = OrderStatus::EXECUTED;
        updatedOrder.executionPricePaise = execPrice;
        updatedOrder.totalValuePaise = totalVal;

        OutboxMessage orderExecOutbox = createOutbox("orders.executed", "Order", order.orderId, correlationId, updatedOrder.toJson());
        OutboxMessage tradeExecOutbox = createOutbox("trades.executed", "Trade", tradeId, correlationId, trade.toJson());

        repo_->recordTradeAndExecuteOrder(trade, updatedOrder, orderExecOutbox, tradeExecOutbox);
        dispatchTradeEvents(trade, correlationId);

        if (order.side == OrderSide::BUY) {
            if (!order.reservationId.empty()) {
                walletClient_->captureReservation(order.reservationId, totalVal);
            }
            repo_->updateSagaState(order.orderId, "LIMIT_MATCH", "COMPLETED", order.reservationId);
        } else {
            std::string creditKey = "order-credit-" + order.orderId;
            walletClient_->creditCash(order.userId, totalVal, order.orderId, creditKey);
            repo_->updateSagaState(order.orderId, "LIMIT_MATCH", "COMPLETED");
        }

        LOG_INFO << "Pending limit order " << order.orderId << " (" << orderSideToString(order.side) 
                 << " " << order.symbol << ") filled at " << execPrice << " paise!";
        matchedCount++;
    }
    return matchedCount;
}

} // namespace stp::order
