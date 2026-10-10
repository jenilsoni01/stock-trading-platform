#pragma once

#include "models.h"
#include <string>
#include <memory>
#include <drogon/HttpClient.h>

namespace stp::order {

class WalletClient {
public:
    explicit WalletClient(const std::string& walletServiceUrl);

    // Synchronously / async helper calls to internal wallet API
    ReservationResult reserveCash(const std::string& userId, const std::string& orderId, 
                                  int64_t amountPaise, const std::string& idempotencyKey);
    
    bool captureReservation(const std::string& reservationId, int64_t amountPaise);
    
    bool releaseReservation(const std::string& reservationId);
    
    bool creditCash(const std::string& userId, int64_t amountPaise, 
                    const std::string& reason, const std::string& idempotencyKey);

private:
    std::string walletServiceUrl_;
    drogon::HttpClientPtr httpClient_;
};

} // namespace stp::order
