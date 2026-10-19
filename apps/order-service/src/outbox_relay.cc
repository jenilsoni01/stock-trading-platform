#include "outbox_relay.h"
#include "saga_orchestrator.h"
#include <trantor/utils/Logger.h>
#include <chrono>

namespace stp::order {

OutboxRelay::OutboxRelay(std::shared_ptr<OrderRepository> repo, 
                         std::shared_ptr<SagaOrchestrator> orchestrator, 
                         int pollIntervalMs)
    : repo_(std::move(repo)), orchestrator_(std::move(orchestrator)), pollIntervalMs_(pollIntervalMs) {}

OutboxRelay::~OutboxRelay() {
    stop();
}

void OutboxRelay::start() {
    if (running_.exchange(true)) return;
    thread_ = std::make_unique<std::thread>(&OutboxRelay::run, this);
    LOG_INFO << "OutboxRelay and Limit Order Matcher started with poll interval " << pollIntervalMs_ << "ms";
}

void OutboxRelay::stop() {
    if (!running_.exchange(false)) return;
    if (thread_ && thread_->joinable()) {
        thread_->join();
    }
    LOG_INFO << "OutboxRelay stopped";
}

void OutboxRelay::run() {
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    while (running_) {
        // 1. Autonomous matching engine for pending limit orders
        try {
            if (orchestrator_) {
                int matched = orchestrator_->processPendingLimitOrders();
                if (matched > 0) {
                    LOG_INFO << "[LIMIT MATCHER] Matched and executed " << matched << " pending limit order(s)";
                }
            }
        } catch (const std::exception& e) {
            LOG_ERROR << "Limit order matching loop error: " << e.what();
        }

        // 2. Publish pending outbox messages
        try {
            auto messages = repo_->getPendingOutboxMessages(50);
            for (const auto& msg : messages) {
                if (!running_) break;

                LOG_INFO << "[OUTBOX RELAY] Publishing event " << msg.eventType 
                         << " (eventId: " << msg.eventId << ", aggregateId: " << msg.aggregateId << ")";

                bool ok = repo_->markOutboxPublished(msg.outboxId);
                if (!ok) {
                    repo_->markOutboxFailed(msg.outboxId);
                }
            }
        } catch (const std::exception& e) {
            LOG_ERROR << "OutboxRelay loop error: " << e.what();
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(pollIntervalMs_));
    }
}

} // namespace stp::order
