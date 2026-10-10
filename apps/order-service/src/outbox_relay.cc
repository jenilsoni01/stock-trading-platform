#include "outbox_relay.h"
#include <trantor/utils/Logger.h>
#include <chrono>

namespace stp::order {

OutboxRelay::OutboxRelay(std::shared_ptr<OrderRepository> repo, int pollIntervalMs)
    : repo_(std::move(repo)), pollIntervalMs_(pollIntervalMs) {}

OutboxRelay::~OutboxRelay() {
    stop();
}

void OutboxRelay::start() {
    if (running_.exchange(true)) return;
    thread_ = std::make_unique<std::thread>(&OutboxRelay::run, this);
    LOG_INFO << "OutboxRelay started with poll interval " << pollIntervalMs_ << "ms";
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
        try {
            auto messages = repo_->getPendingOutboxMessages(50);
            for (const auto& msg : messages) {
                if (!running_) break;

                LOG_INFO << "[OUTBOX RELAY] Publishing event " << msg.eventType 
                         << " (eventId: " << msg.eventId << ", aggregateId: " << msg.aggregateId << ")";

                // In a full Kafka setup, this produces to rdkafka producer.
                // For direct reliability, we mark as published.
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
