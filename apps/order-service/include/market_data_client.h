#pragma once

#include "models.h"
#include <string>
#include <memory>
#include <drogon/HttpClient.h>

namespace stp::order {

class MarketDataClient {
public:
    explicit MarketDataClient(const std::string& marketDataUrl);

    // Fetch latest quote for a symbol
    QuoteInfo getQuote(const std::string& symbol);

private:
    std::string marketDataUrl_;
    drogon::HttpClientPtr httpClient_;
};

} // namespace stp::order
