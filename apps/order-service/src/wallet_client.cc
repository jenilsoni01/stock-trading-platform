#include "wallet_client.h"
#include <drogon/drogon.h>
#include <trantor/utils/Logger.h>
#include <future>

namespace stp::order {

WalletClient::WalletClient(const std::string& walletServiceUrl)
    : walletServiceUrl_(walletServiceUrl) {
    httpClient_ = drogon::HttpClient::newHttpClient(walletServiceUrl_);
}

ReservationResult WalletClient::reserveCash(const std::string& userId, const std::string& orderId, 
                                            int64_t amountPaise, const std::string& idempotencyKey) {
    ReservationResult result;
    try {
        auto req = drogon::HttpRequest::newHttpRequest();
        req->setMethod(drogon::Post);
        req->setPath("/internal/v1/wallet/reservations");
        req->setContentTypeCode(drogon::CT_APPLICATION_JSON);

        Json::Value body;
        body["userId"] = userId;
        body["orderId"] = orderId;
        body["amountPaise"] = static_cast<Json::Int64>(amountPaise);
        body["idempotencyKey"] = idempotencyKey;

        Json::StreamWriterBuilder writer;
        req->setBody(Json::writeString(writer, body));

        auto [reqResult, response] = httpClient_->sendRequest(req, 3.0); // 3 sec timeout
        if (reqResult == drogon::ReqResult::Ok && response && (response->statusCode() == drogon::k200OK || response->statusCode() == drogon::k201Created)) {
            auto jsonPtr = response->getJsonObject();
            if (jsonPtr) {
                result.success = (*jsonPtr).get("status", "").asString() == "COMPLETED" || 
                                 (*jsonPtr).get("status", "").asString() == "PENDING" ||
                                 (*jsonPtr).isMember("reservationId");
                result.reservationId = (*jsonPtr).get("reservationId", "").asString();
                result.message = "Reservation successful";
            }
        } else {
            result.success = false;
            if (response) {
                auto jsonPtr = response->getJsonObject();
                if (jsonPtr && (*jsonPtr).isMember("message")) {
                    result.message = (*jsonPtr)["message"].asString();
                } else {
                    result.message = "HTTP " + std::to_string(response->statusCode());
                }
            } else {
                result.message = "Connection to Wallet Service timed out or failed";
            }
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Wallet reserve exception: " << e.what();
        result.success = false;
        result.message = e.what();
    }
    return result;
}

bool WalletClient::captureReservation(const std::string& reservationId, int64_t amountPaise) {
    if (reservationId.empty()) return false;
    try {
        auto req = drogon::HttpRequest::newHttpRequest();
        req->setMethod(drogon::Post);
        req->setPath("/internal/v1/wallet/reservations/" + reservationId + "/capture");
        req->setContentTypeCode(drogon::CT_APPLICATION_JSON);

        Json::Value body;
        body["amountPaise"] = static_cast<Json::Int64>(amountPaise);

        Json::StreamWriterBuilder writer;
        req->setBody(Json::writeString(writer, body));

        auto [reqResult, response] = httpClient_->sendRequest(req, 3.0);
        return reqResult == drogon::ReqResult::Ok && response && response->statusCode() == drogon::k200OK;
    } catch (const std::exception& e) {
        LOG_ERROR << "Wallet capture exception: " << e.what();
        return false;
    }
}

bool WalletClient::releaseReservation(const std::string& reservationId) {
    if (reservationId.empty()) return false;
    try {
        auto req = drogon::HttpRequest::newHttpRequest();
        req->setMethod(drogon::Post);
        req->setPath("/internal/v1/wallet/reservations/" + reservationId + "/release");
        req->setContentTypeCode(drogon::CT_APPLICATION_JSON);

        auto [reqResult, response] = httpClient_->sendRequest(req, 3.0);
        return reqResult == drogon::ReqResult::Ok && response && response->statusCode() == drogon::k200OK;
    } catch (const std::exception& e) {
        LOG_ERROR << "Wallet release exception: " << e.what();
        return false;
    }
}

bool WalletClient::creditCash(const std::string& userId, int64_t amountPaise, 
                              const std::string& reason, const std::string& idempotencyKey) {
    try {
        auto req = drogon::HttpRequest::newHttpRequest();
        req->setMethod(drogon::Post);
        req->setPath("/internal/v1/wallet/credit");
        req->setContentTypeCode(drogon::CT_APPLICATION_JSON);

        Json::Value body;
        body["userId"] = userId;
        body["amountPaise"] = static_cast<Json::Int64>(amountPaise);
        body["reason"] = reason;
        body["idempotencyKey"] = idempotencyKey;

        Json::StreamWriterBuilder writer;
        req->setBody(Json::writeString(writer, body));

        auto [reqResult, response] = httpClient_->sendRequest(req, 3.0);
        return reqResult == drogon::ReqResult::Ok && response && (response->statusCode() == drogon::k200OK || response->statusCode() == drogon::k201Created);
    } catch (const std::exception& e) {
        LOG_ERROR << "Wallet credit exception: " << e.what();
        return false;
    }
}

} // namespace stp::order
