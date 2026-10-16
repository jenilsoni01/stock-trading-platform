#include "market_data_client.h"
#include <drogon/drogon.h>
#include <trantor/utils/Logger.h>

namespace stp::order {

MarketDataClient::MarketDataClient(const std::string& marketDataUrl)
    : marketDataUrl_(marketDataUrl) {
    httpClient_ = drogon::HttpClient::newHttpClient(marketDataUrl_);
}

QuoteInfo MarketDataClient::getQuote(const std::string& symbol) {
    QuoteInfo quote;
    quote.symbol = symbol;
    quote.valid = false;

    try {
        auto req = drogon::HttpRequest::newHttpRequest();
        req->setMethod(drogon::Get);
        req->setPath("/api/v1/stocks/" + symbol + "/quote");

        auto [reqResult, response] = httpClient_->sendRequest(req, 3.0);
        if (reqResult == drogon::ReqResult::Ok && response && response->statusCode() == drogon::k200OK) {
            auto jsonPtr = response->getJsonObject();
            if (jsonPtr) {
                if ((*jsonPtr).isMember("currentPricePaise") && !(*jsonPtr)["currentPricePaise"].isNull()) {
                    quote.currentPricePaise = (*jsonPtr).get("currentPricePaise", 0).asInt64();
                } else if ((*jsonPtr).isMember("pricePaise") && !(*jsonPtr)["pricePaise"].isNull()) {
                    quote.currentPricePaise = (*jsonPtr).get("pricePaise", 0).asInt64();
                }

                if ((*jsonPtr).isMember("previousClosePaise") && !(*jsonPtr)["previousClosePaise"].isNull()) {
                    quote.previousClosePaise = (*jsonPtr).get("previousClosePaise", 0).asInt64();
                } else if ((*jsonPtr).isMember("previousPricePaise") && !(*jsonPtr)["previousPricePaise"].isNull()) {
                    quote.previousClosePaise = (*jsonPtr).get("previousPricePaise", 0).asInt64();
                }

                quote.dayHighPaise = (*jsonPtr).get("dayHighPaise", 0).asInt64();
                quote.dayLowPaise = (*jsonPtr).get("dayLowPaise", 0).asInt64();
                quote.valid = (quote.currentPricePaise > 0);
            }
        } else {
            std::string statusStr = response ? std::to_string(response->statusCode()) : "TIMEOUT";
            LOG_WARN << "MarketDataClient getQuote failed for " << symbol << ": status=" << statusStr;
            quote.errorMessage = response ? ("HTTP " + statusStr) : "Connection timeout";
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "MarketDataClient getQuote exception: " << e.what();
        quote.errorMessage = e.what();
    }

    return quote;
}

} // namespace stp::order
