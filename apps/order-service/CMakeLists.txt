cmake_minimum_required(VERSION 3.16)
project(order-service CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Dependencies
find_package(Drogon REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

# Include directories
include_directories(
    ${PROJECT_SOURCE_DIR}/include
    ${PROJECT_SOURCE_DIR}/src
    ${DROGON_INCLUDE_DIRS}
    ${OPENSSL_INCLUDE_DIR}
)

# Source files
set(SOURCES
    src/main.cc
    src/order_repository.cc
    src/wallet_client.cc
    src/market_data_client.cc
    src/saga_orchestrator.cc
    src/outbox_relay.cc
    src/order_controller.cc
    src/trade_controller.cc
    src/health_controller.cc
)

add_executable(order-service ${SOURCES})

target_link_libraries(order-service PRIVATE
    Drogon::Drogon
    OpenSSL::SSL
    OpenSSL::Crypto
    Threads::Threads
)
