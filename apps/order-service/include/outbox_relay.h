#pragma once

#include "order_repository.h"
#include <memory>
#include <thread>
#include <atomic>

namespace stp::order {

class OutboxRelay {
public:
    OutboxRelay(std::shared_ptr<OrderRepository> repo, int pollIntervalMs = 2000);
    ~OutboxRelay();

    void start();
    void stop();

private:
    void run();

    std::shared_ptr<OrderRepository> repo_;
    int pollIntervalMs_;
    std::atomic<bool> running_{false};
    std::unique_ptr<std::thread> thread_;
};

} // namespace stp::order
