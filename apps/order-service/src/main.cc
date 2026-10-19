#include <drogon/drogon.h>
#include <trantor/utils/Logger.h>
#include "order_repository.h"
#include "wallet_client.h"
#include "market_data_client.h"
#include "saga_orchestrator.h"
#include "outbox_relay.h"
#include "order_controller.h"
#include "trade_controller.h"

using namespace stp::order;

int main(int argc, char* argv[]) {
    LOG_INFO << "Starting Stock Trading Platform - Order Service (C++/Drogon)...";

    std::string configFile = "config.json";
    if (argc > 1) {
        configFile = argv[1];
    }

    try {
        drogon::app().loadConfigFile(configFile);
    } catch (const std::exception& e) {
        LOG_WARN << "Could not load " << configFile << ": " << e.what() << ", using defaults/env";
    }

    int listenPort = 8083;
    if (const char* envPort = std::getenv("PORT")) {
        try { listenPort = std::stoi(envPort); } catch (...) {}
    } else if (const char* envPort2 = std::getenv("ORDER_SERVICE_PORT")) {
        try { listenPort = std::stoi(envPort2); } catch (...) {}
    }
    drogon::app().addListener("0.0.0.0", listenPort);

    // Read environment overrides if available
    const char* envInfraHost = std::getenv("INFRA_HOST");
    std::string defaultHost = (envInfraHost != nullptr && std::strlen(envInfraHost) > 0) ? envInfraHost : "mysql";

    const char* envDbHost = std::getenv("DB_HOST");
    std::string dbHost = (envDbHost != nullptr) ? envDbHost : defaultHost;
    const char* envDbUser = std::getenv("DB_USER");
    std::string dbUser = (envDbUser != nullptr) ? envDbUser : "order_service";
    const char* envDbPass = std::getenv("DB_PASSWORD");
    std::string dbPass = (envDbPass != nullptr) ? envDbPass : "dev_mysql_pass";
    const char* envDbName = std::getenv("DB_NAME");
    std::string dbName = (envDbName != nullptr) ? envDbName : "order_service_db";

    int dbPort = 3306;
    if (const char* envPort = std::getenv("DB_PORT")) {
        try { dbPort = std::stoi(envPort); } catch (...) {}
    }

    LOG_INFO << "Configuring MySQL: host=" << dbHost << ":" << dbPort << ", user=" << dbUser << ", db=" << dbName;
    drogon::app().createDbClient("mysql", dbHost, dbPort, dbName, dbUser, dbPass, 8, "", "default", false, "utf8mb4");

    auto repo = std::make_shared<OrderRepository>();
    repo->initSchema();

    // Read upstream URLs
    std::string defaultServiceHost = (envInfraHost != nullptr && std::strlen(envInfraHost) > 0) ? envInfraHost : "localhost";
    std::string walletUrl = "http://" + defaultServiceHost + ":8081";
    if (const char* envWallet = std::getenv("WALLET_SERVICE_URL")) {
        walletUrl = envWallet;
    }

    std::string marketUrl = "http://" + defaultServiceHost + ":8082";
    if (const char* envMarket = std::getenv("MARKET_DATA_URL")) {
        marketUrl = envMarket;
    }

    LOG_INFO << "Upstream Wallet Service: " << walletUrl;
    LOG_INFO << "Upstream Market Data Service: " << marketUrl;

    auto walletClient = std::make_shared<WalletClient>(walletUrl);
    auto marketDataClient = std::make_shared<MarketDataClient>(marketUrl);

    auto orchestrator = std::make_shared<SagaOrchestrator>(repo, walletClient, marketDataClient);

    // Inject into controllers
    OrderController::setDependencies(orchestrator, repo);
    TradeController::setDependencies(repo);

    // Start background outbox polling and limit order matching relay
    int pollInterval = 1500;
    if (const char* envInterval = std::getenv("OUTBOX_POLL_INTERVAL_MS")) {
        try { pollInterval = std::stoi(envInterval); } catch (...) {}
    }
    auto outboxRelay = std::make_shared<OutboxRelay>(repo, orchestrator, pollInterval);
    drogon::app().registerBeginningAdvice([outboxRelay]() {
        outboxRelay->start();
    });

    // Run the Drogon framework
    drogon::app().run();

    // Clean shutdown
    outboxRelay->stop();
    LOG_INFO << "Order Service shutdown complete.";
    return 0;
}
