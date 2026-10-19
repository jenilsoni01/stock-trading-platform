#pragma once

#include "order_repository.h"
#include <memory>
#include <thread>
#include <atomic>

namespace stp::order {

class SagaOrchestrator;

class OutboxRelay {
public:
    OutboxRelay(std::shared_ptr<OrderRepository> repo, 
                std::shared_ptr<SagaOrchestrator> orchestrator = nullptr, 
                int pollIntervalMs = 1500);
    ~OutboxRelay();

    void start();
    void stop();

private:
    void run();

    std::shared_ptr<OrderRepository> repo_;
    std::shared_ptr<SagaOrchestrator> orchestrator_;
    int pollIntervalMs_;
    std::atomic<bool> running_{false};
    std::unique_ptr<std::thread> thread_;
};

} // namespace stp::order

