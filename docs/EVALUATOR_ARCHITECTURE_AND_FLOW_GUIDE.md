# 🏛️ Distributed Stock Trading Platform — Evaluator Architecture & Request Flow Guide

**Document Purpose**: Comprehensive architectural reference, distributed request flow breakdown, and defense/viva cheat sheet for project evaluation.  
**Architecture Style**: Polyglot, Event-Driven, Saga-Orchestrated Distributed Microservices deployed across 5 physical machines over LAN.  
**Repository**: [github.com/jenilsoni01/stock-trading-platform](https://github.com/jenilsoni01/stock-trading-platform)

---

## 📑 Table of Contents
1. [Executive Summary & The 30-Second Evaluator Pitch](#1-executive-summary--the-30-second-evaluator-pitch)
2. [High-Level Architecture & Multi-PC Network Topology](#2-high-level-architecture--multi-pc-network-topology)
3. [Polyglot Technology Stack & Database Selection Matrix](#3-polyglot-technology-stack--database-selection-matrix)
4. [Core Distributed Systems Patterns](#4-core-distributed-systems-patterns)
   - [Orchestrated Saga Pattern](#41-orchestrated-saga-pattern)
   - [Transactional Outbox Pattern (Dual-Write Prevention)](#42-transactional-outbox-pattern-dual-write-prevention)
   - [CQRS (Command Query Responsibility Segregation)](#43-cqrs-command-query-responsibility-segregation)
   - [Integer Paise Financial Invariant & Double-Entry Ledger](#44-integer-paise-financial-invariant--double-entry-ledger)
   - [Distributed Idempotency Enforcement](#45-distributed-idempotency-enforcement)
5. [End-to-End Request Flows (Deep-Dive Sequence Diagrams)](#5-end-to-end-request-flows-deep-dive-sequence-diagrams)
   - [Flow 1: User Registration & Virtual Capitalization](#flow-1-user-registration--virtual-capitalization)
   - [Flow 2: High-Frequency Market Data Ticks Engine](#flow-2-high-frequency-market-data-ticks-engine)
   - [Flow 3: Complete Buy/Sell Order Saga Workflow (Master Sequence)](#flow-3-complete-buysell-order-saga-workflow-master-sequence)
   - [Flow 4: Sub-Millisecond Portfolio & P&L Calculation (Redis Read Model)](#flow-4-sub-millisecond-portfolio--pl-calculation-redis-read-model)
   - [Flow 5: Asynchronous Notification & Alert Dispatch](#flow-5-asynchronous-notification--alert-dispatch)
6. [Multi-PC Physical Deployment & Communication](#6-multi-pc-physical-deployment--communication)
7. [Evaluator Q&A / Viva Defense Cheat Sheet](#7-evaluator-qa--viva-defense-cheat-sheet)
8. [5-Minute Live Evaluation Demo Script](#8-5-minute-live-evaluation-demo-script)

---

## 1. Executive Summary & The 30-Second Evaluator Pitch

> **The Evaluator Pitch**:  
> *"Our project is an enterprise-grade, simulated paper-trading platform designed to mirror modern high-frequency electronic exchanges like Zerodha, Robinhood, and NASDAQ. Rather than building a generic monolith, we engineered a distributed, polyglot system running across **5 physical machines** on a local network. Each microservice is paired with the optimal programming language and database for its specific workload: **C++17/MySQL** for sub-millisecond order matching and distributed Sagas, **Go/MongoDB** for concurrent price streaming, **Java/PostgreSQL** for double-entry financial ledger ACID safety, **Python/Redis** for O(1) in-memory portfolio CQRS projections, and **Node.js/Firestore** for non-blocking notifications, all secured behind a unified **Spring Cloud API Gateway** with an **Apache Kafka** event streaming backbone."*

### Key Engineering Highlights:
- **Zero IEEE-754 Floating Point Errors**: 100% of financial math is performed in **integer paise** ($1.00 = 100 paise).
- **No Dual-Write Vulnerabilities**: Order and trade events utilize the **Transactional Outbox Pattern** to ensure database commits and Kafka events never diverge.
- **No Distributed Locking (2PC)**: Distributed transactions across the 5 machines are coordinated via an **Orchestrated Saga** with automatic compensating rollbacks.
- **Heterogeneous Polyglot Stack**: 5 languages (Java 21, Go 1.22, C++17, Python 3.11, Node.js 20) communicating synchronously via REST/gRPC and asynchronously via Kafka 7.7.

---

## 2. High-Level Architecture & Multi-PC Network Topology

The platform operates across 5 physical laptops connected to the same LAN (Wi-Fi or Gigabit Switch):

```mermaid
flowchart TD
    Trader["👤 Trader / Web Browser<br/>http://localhost:3000"]

    subgraph PC1 ["💻 PC 1: Host & Orchestrator (Jenil - Windows / 10.43.5.202)"]
        UI["🌐 React 18 + Vite Web Client<br/>(Port 3000)"]
        Gateway["🚪 Spring Cloud API Gateway<br/>(Port 8080)<br/>• JWT Auth • Route Dispatcher • Rate Limiting"]
        Eureka["🔍 Netflix Eureka Server<br/>(Port 8761)"]
        Identity["🔐 Identity & Wallet Service<br/>(Java 21 / Spring Boot 3.3 - Port 8081)"]
        Postgres[("🐘 PostgreSQL 16<br/>Double-Entry Ledger & Cash Reservations")]
        Kafka{{"📬 Apache Kafka 7.7 + Zookeeper<br/>Ports: 9092 (Internal) / 9093 (LAN Broadcast)"}}
    end

    subgraph PC2 ["💻 PC 2: Market Data Node (Jeel - macOS / 10.43.5.228)"]
        Market["📈 Market Data Service<br/>(Go 1.22 / Gin - Port 8082 / gRPC: 50051)"]
        MongoDB[("🍃 MongoDB 7.0<br/>35 Stock Quotes & Tick History")]
    end

    subgraph PC3 ["💻 PC 3: Order Engine Node (Harsh - Windows / 10.43.5.131)"]
        Order["⚡ Order & Saga Service<br/>(C++17 / Drogon - Port 8083)"]
        MySQL[("🐬 MySQL 8.0<br/>Orders, Trades, Outbox Table")]
    end

    subgraph PC4 ["💻 PC 4: Portfolio CQRS Node (Kevl - macOS / 10.43.5.228)"]
        Portfolio["📊 Portfolio Service<br/>(Python 3.11 / FastAPI - Port 8084)"]
        Redis[("⚡ Redis 7.2<br/>In-Memory Materialized Holdings & P&L")]
    end

    subgraph PC5 ["💻 PC 5: Notification Node (Krish - Windows / 10.43.5.228)"]
        Notification["🔔 Notification Service<br/>(Node.js 20 / Express - Port 8085)"]
        Firestore[("🔥 Firestore / In-Memory Log<br/>Trade Alerts & User Preferences")]
    end

    Trader -->|HTTP / REST| UI
    UI -->|HTTP / REST| Gateway

    Gateway -->|/api/v1/auth, /wallet| Identity
    Gateway -->|/api/v1/stocks| Market
    Gateway -->|/api/v1/orders, /trades| Order
    Gateway -->|/api/v1/portfolio| Portfolio
    Gateway -->|/api/v1/notifications| Notification

    Identity --- Postgres
    Market --- MongoDB
    Order --- MySQL
    Portfolio --- Redis
    Notification --- Firestore

    Order -.->|gRPC / REST Quote Lookup| Market
    Order -.->|REST Cash Reserve & Capture| Identity

    Order ==>|Transactional Outbox Relay| Kafka
    Kafka ==>|Topic: trades.executed| Portfolio
    Kafka ==>|Topic: orders.executed| Notification
    Kafka ==>|Topic: orders.cancelled| Notification
```

---

## 3. Polyglot Technology Stack & Database Selection Matrix

Each technology was deliberately chosen based on the domain requirements of that specific microservice:

| PC / Service | Owner & Roll No. | Language & Framework | Database & Storage | Architectural Justification |
| :--- | :--- | :--- | :--- | :--- |
| **PC 1: Identity & Wallet** | Jenil Soni<br/>(23BCE119 - Lead) | **Java 21**<br/>Spring Boot 3.3 | **PostgreSQL 16**<br/>(ACID Relational) | Strong typing, enterprise-grade Spring Security with JWT, and **strict ACID transactions with row-level locks** (`SELECT FOR UPDATE`) to guarantee zero balance double-spending. |
| **PC 1: API Gateway** | Jenil Soni | **Java 21**<br/>Spring Cloud Gateway | Stateless<br/>(Reactive Netty) | Non-blocking asynchronous reverse proxy, centralized JWT token verification, dynamic route re-writing, and CORS handling across the 5 LAN nodes. |
| **PC 2: Market Data** | Jeel Dhamsaniya<br/>(23BCE116) | **Go 1.22**<br/>Gin + gRPC | **MongoDB 7.0**<br/>(Document Store) | Go's lightweight **goroutines** (2 KB stack) excel at concurrent, high-frequency tick simulation. MongoDB handles flexible JSON time-series tick arrays and sparkline histories without schema migration friction. |
| **PC 3: Order Engine** | Harsh Thakkar<br/>(23BCE091) | **C++17**<br/>Drogon Framework | **MySQL 8.0**<br/>(InnoDB ACID) | Ultra-low latency execution engine. C++ eliminates JVM garbage collection pauses. Drogon leverages Linux `epoll` asynchronous I/O. MySQL manages transactional order lifecycles and the Outbox table. |
| **PC 4: Portfolio** | Kevl Dholakiya<br/>(23BCE066) | **Python 3.11**<br/>FastAPI | **Redis 7.2**<br/>(In-Memory Hash Store) | Python provides rich data science libraries for mathematical calculations (Weighted Average Cost Basis, Realized/Unrealized P&L). Redis provides sub-millisecond $O(1)$ read-heavy portfolio queries (CQRS read model). |
| **PC 5: Notification** | Krish Chothani<br/>(23BCE151) | **Node.js 20**<br/>Express | **Firestore Emulator**<br/>+ In-Memory Cache | Single-threaded non-blocking event-driven I/O perfectly matches I/O-bound push alert dispatches, multi-channel fan-out (In-App, Email, SMS), and preference filtering. |

---

## 4. Core Distributed Systems Patterns

### 4.1. Orchestrated Saga Pattern
- **Problem**: A distributed BUY order spans 4 distinct microservices across 4 physical laptops (Order $\rightarrow$ Market Data $\rightarrow$ Identity & Wallet $\rightarrow$ Portfolio). Traditional Distributed 2-Phase Commit (2PC) locks databases across the network, leading to catastrophic bottlenecks and single points of failure.
- **Solution**: We implemented an **Orchestrated Saga** where the C++ Drogon Order Service acts as the centralized Saga Coordinator:
  1. **Phase 1 (Price Discovery)**: Order Service requests current quote from Market Data Service.
  2. **Phase 2 (Cash Reservation)**: Order Service requests Wallet Service to pessimistically reserve funds (`POST /internal/v1/wallet/reservations`).
  3. **Phase 3 (Order Execution)**: Order Service atomically writes the executed trade and outbox event into MySQL.
  4. **Phase 4 (Cash Capture)**: Order Service confirms settlement with Wallet Service (`POST /internal/v1/wallet/reservations/{id}/capture`).
  5. **Compensating Transaction (Rollback)**: If price slips, stock is halted, or execution fails, the Order Service dispatches a release request (`POST /internal/v1/wallet/reservations/{id}/release`), restoring the trader's balance instantly.

### 4.2. Transactional Outbox Pattern (Dual-Write Prevention)
- **Problem**: When an order executes, the service must update the local MySQL database AND publish an event to Apache Kafka. If the database commits but Kafka crashes, events are lost. If Kafka sends the event but the database transaction rolls back, downstream services consume phantom trades (the infamous **Dual-Write Problem**).
- **Solution**:
  ```
  Local Database Transaction:
  BEGIN TRANSACTION;
    INSERT INTO trades (...);
    UPDATE orders SET status = 'EXECUTED';
    INSERT INTO outbox_messages (topic, payload, status) VALUES ('trades.executed', '{...}', 'PENDING');
  COMMIT;
  ```
  An asynchronous **Outbox Relay worker** polls the `outbox_messages` table, reliably publishes to Kafka, and marks the record `PUBLISHED`. Guaranteed **at-least-once delivery** with zero distributed state divergence.

### 4.3. CQRS (Command Query Responsibility Segregation)
- **Write Side (Commands)**: C++ Order Service + MySQL. Optimized for strict relational integrity, transaction rollbacks, and ACID persistence.
- **Read Side (Queries)**: Python Portfolio Service + Redis. Traders refresh their portfolio dashboards every second. Directly hitting MySQL for aggregations (`SUM`, `AVG`, `GROUP BY`) under high load causes database lock contention.
- **Synchronization**: When a trade executes, Kafka dispatches `trades.executed`. The Portfolio Service consumes the event, recalculates the trader's Weighted Average Cost Basis and P&L, and writes the materialized view into Redis. Portfolio dashboard reads are served from Redis in **$< 1.5\text{ ms}$**.

### 4.4. Integer Paise Financial Invariant & Double-Entry Ledger
- **The Floating Point Trap**: Storing money in standard floats or doubles (`float64`) introduces IEEE-754 precision errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial systems, fractions of a cent compound into severe balance discrepancies.
- **Our Invariant**: **All monetary amounts are represented as 64-bit signed integers in paise** (1 INR = 100 paise; ₹1,000.50 is stored as `100050`).
- **Double-Entry Ledger**: The Identity & Wallet Service maintains an immutable, append-only `ledger_entries` table. Balances are never modified with blind `UPDATE balance = balance + X`. Every rupee must have a corresponding credit or debit record, guaranteeing auditability.

### 4.5. Distributed Idempotency Enforcement
- High-frequency network drops over Wi-Fi can trigger automatic client retries.
- Every mutating request accepts an `Idempotency-Key` header (UUIDv4).
- The receiving service verifies the key against a unique database constraint / cache with a TTL. If a duplicate request arrives, the service returns the cached response without re-executing the trade or double-debiting the wallet.

---

## 5. End-to-End Request Flows (Deep-Dive Sequence Diagrams)

### Flow 1: User Registration & Virtual Capitalization

When a new trader signs up, they receive an initial virtual capital of **₹1,00,000.00** (10,000,000 paise) to begin paper trading.

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Trader
    participant Web as 🌐 React Client
    participant GW as 🚪 API Gateway (Port 8080)
    participant IW as 🔐 Identity & Wallet (Port 8081)
    participant PG as 🐘 PostgreSQL 16

    User->>Web: Fill Registration Form (email, password, name)
    Web->>GW: POST /api/v1/auth/register
    GW->>IW: Forward /api/v1/auth/register
    IW->>IW: Hash password using BCrypt (cost factor 10)
    
    rect rgb(20, 45, 30)
        Note over IW,PG: Atomic Registration & Ledger Invariant
        IW->>PG: BEGIN TRANSACTION
        IW->>PG: INSERT INTO users (email, password_hash, full_name, role)
        IW->>PG: INSERT INTO wallet_accounts (user_id, balance_paise = 10000000, reserved_paise = 0)
        IW->>PG: INSERT INTO ledger_entries (wallet_id, amount_paise = +10000000, type = 'INITIAL_GRANT')
        IW->>PG: COMMIT TRANSACTION
    end

    IW->>IW: Generate HMAC-SHA256 JWT (Claims: userId, email, role, exp: 24h)
    IW-->>GW: 201 Created { token, user: { id, email, balancePaise: 10000000 } }
    GW-->>Web: 201 Created (Stores JWT in browser localStorage)
    Web-->>User: Redirect to Live Trading Dashboard
```

---

### Flow 2: High-Frequency Market Data Ticks Engine

The Go Market Data Service simulates real-world exchange movements across **35 instruments** (25 Indian NSE Bluechips + 10 US Equities) using **Geometric Brownian Motion (GBM)**.

```mermaid
sequenceDiagram
    autonumber
    participant Sim as ⚙️ Go Price Simulator (Goroutine)
    participant Mongo as 🍃 MongoDB (stocks collection)
    participant Web as 🌐 React Trading Client
    participant GW as 🚪 API Gateway
    participant MarketSvc as 📈 Market Data (Go / Gin - Port 8082)

    loop Every 2 Seconds (Autonomous Background Ticks)
        Sim->>Sim: Compute Geometric Brownian Motion: dS = S * (μ dt + σ dW)
        Sim->>Sim: Update previousPrice, currentPrice, dayHigh, dayLow
        Sim->>Mongo: Bulk Write updated price documents
    end

    loop Every 3-5 Seconds (Web Polling / Tick Refresh)
        Web->>GW: GET /api/v1/stocks (Headers: Authorization: Bearer <JWT>)
        GW->>GW: Validate JWT signature & claims
        GW->>MarketSvc: Forward GET /api/v1/stocks
        MarketSvc->>Mongo: FindAll active stocks
        Mongo-->>MarketSvc: 35 Stock Documents (NSE & US Equities)
        MarketSvc-->>GW: 200 OK [ { symbol: "RELIANCE", currentPricePaise: 279093, ... } ]
        GW-->>Web: 200 OK JSON
        Web->>Web: Render Green/Red Price Flashes & Watchlist Tickers
    end
```

---

### Flow 3: Complete Buy/Sell Order Saga Workflow (Master Sequence)

This is the primary workflow of the entire platform, demonstrating all 5 microservices, 4 physical PCs, and Kafka operating in unison.

```mermaid
sequenceDiagram
    autonumber
    actor Trader as 👤 Trader
    participant Web as 🌐 React Client (PC 1)
    participant GW as 🚪 Gateway (PC 1)
    participant Order as ⚡ Order Service (PC 3 / Drogon C++)
    participant Market as 📈 Market Data (PC 2 / Go)
    participant Wallet as 🔐 Identity & Wallet (PC 1 / Java)
    participant MySQL as 🐬 MySQL 8.0 (PC 3)
    participant Postgres as 🐘 PostgreSQL (PC 1)
    participant Kafka as 📬 Apache Kafka (PC 1)
    participant Portfolio as 📊 Portfolio (PC 4 / Python)
    participant Notif as 🔔 Notification (PC 5 / Node.js)

    Trader->>Web: Click BUY (Symbol: "TCS", Quantity: 5, Type: MARKET)
    Web->>GW: POST /api/v1/orders { symbol: "TCS", side: "BUY", quantity: 5, type: "MARKET" }
    GW->>GW: Validate JWT, extract userId, inject X-User-Id header
    GW->>Order: Forward POST /api/v1/orders over LAN (PC 1 -> PC 3:8083)

    rect rgb(30, 40, 55)
        Note over Order,Market: Saga Step 1: Real-Time Price Discovery
        Order->>Market: GET /api/v1/stocks/TCS (or gRPC :50051) over LAN
        Market-->>Order: Current Price: ₹3,905.65 (390565 paise)
        Order->>Order: Compute totalRequiredPaise = 5 * 390565 = 1952825 paise (₹19,528.25)
    end

    rect rgb(20, 50, 30)
        Note over Order,Wallet: Saga Step 2: Pessimistic Cash Reservation
        Order->>Wallet: POST /internal/v1/wallet/reservations { userId, amountPaise: 1952825 }
        Wallet->>Postgres: SELECT balance_paise, reserved_paise FROM wallet_accounts WHERE user_id = ? FOR UPDATE
        alt Insufficient Available Balance
            Postgres-->>Wallet: available < 1952825
            Wallet-->>Order: 400 Bad Request { error: "INSUFFICIENT_FUNDS" }
            Order-->>GW: 400 Bad Request
            GW-->>Web: Display "Insufficient Wallet Balance" error to Trader
        else Balance Available
            Wallet->>Postgres: UPDATE wallet_accounts SET reserved_paise = reserved_paise + 1952825
            Wallet->>Postgres: INSERT INTO cash_reservations (id, user_id, amount_paise, status = 'ACTIVE')
            Wallet-->>Order: 201 Created { reservationId: "res_uuid_123" }
        end
    end

    rect rgb(50, 40, 20)
        Note over Order,MySQL: Saga Step 3: Atomic Order Execution & Transactional Outbox
        Order->>MySQL: BEGIN TRANSACTION
        Order->>MySQL: INSERT INTO orders (id, user_id, symbol, side, qty, status = 'EXECUTED')
        Order->>MySQL: INSERT INTO trades (id, order_id, price_paise = 390565, qty = 5)
        Order->>MySQL: INSERT INTO outbox_messages (topic = 'trades.executed', payload = '{...}', status = 'PENDING')
        Order->>MySQL: COMMIT TRANSACTION
    end

    rect rgb(20, 50, 30)
        Note over Order,Wallet: Saga Step 4: Final Settlement & Capture
        Order->>Wallet: POST /internal/v1/wallet/reservations/res_uuid_123/capture
        Wallet->>Postgres: Deduct balance_paise (-1952825) & Clear reserved_paise (-1952825)
        Wallet->>Postgres: INSERT INTO ledger_entries (type = 'TRADE_BUY', amount_paise = -1952825)
        Wallet-->>Order: 200 OK (Settlement Confirmed)
    end

    Order-->>GW: 201 Created { orderId, tradeId, status: "EXECUTED", pricePaise: 390565 }
    GW-->>Web: 201 Created (Instant UI Confirmation to Trader: < 35ms total latency)

    rect rgb(40, 25, 50)
        Note over Order,Notif: Saga Step 5: Asynchronous Outbox Relay & CQRS Updates
        Order->>Kafka: Outbox worker relays event to Kafka (Topic: trades.executed)
        Order->>MySQL: UPDATE outbox_messages SET status = 'PUBLISHED'
        
        Kafka->>Portfolio: Ingest trades.executed (PC 4)
        Portfolio->>Portfolio: Calculate Weighted Average Cost Basis & Holdings in Python
        Portfolio->>Portfolio: Write updated holding JSON into Redis (O(1) in-memory)

        Kafka->>Notif: Ingest trades.executed (PC 5)
        Notif->>Notif: Format alert: "Bought 5 shares of TCS @ ₹3,905.65"
        Notif->>Notif: Increment user unread count badge & store notification record
    end
```

---

### Flow 4: Sub-Millisecond Portfolio & P&L Calculation (Redis Read Model)

When the trader navigates to the Portfolio tab, the request avoids heavy relational joins by querying the pre-materialized CQRS view in Redis.

```mermaid
sequenceDiagram
    autonumber
    actor Trader as 👤 Trader
    participant Web as 🌐 React Client
    participant GW as 🚪 API Gateway (PC 1)
    participant Portfolio as 📊 Portfolio Service (PC 4 / Python FastAPI)
    participant Redis as ⚡ Redis 7.2 (PC 4)
    participant Market as 📈 Market Data (PC 2 / Go)

    Trader->>Web: Open "Portfolio" Tab
    Web->>GW: GET /api/v1/portfolio/summary
    GW->>Portfolio: Forward GET /api/v1/portfolio/summary (with X-User-Id header)
    
    Portfolio->>Redis: HGETALL portfolio:{userId}:holdings
    Redis-->>Portfolio: Cached Holdings (Symbol, Quantity, AverageCostPaise)
    
    Portfolio->>Market: GET /api/v1/stocks (Current live market prices)
    Market-->>Portfolio: Live Quotes for held symbols
    
    Portfolio->>Portfolio: Compute in memory (Vectorized Python arithmetic):
    Note over Portfolio: currentVal = qty * currentPrice<br/>investedVal = qty * avgCost<br/>unrealizedPnL = currentVal - investedVal<br/>pnlPercentage = (unrealizedPnL / investedVal) * 100
    
    Portfolio-->>GW: 200 OK { totalInvestedPaise, currentValuePaise, totalPnLPaise, holdings: [...] }
    GW-->>Web: 200 OK JSON (Response time: < 2ms)
    Web-->>Trader: Render Holdings Table, Green/Red P&L cards, & Asset Allocation Pie Chart
```

---

### Flow 5: Asynchronous Notification & Alert Dispatch

```mermaid
sequenceDiagram
    autonumber
    actor Trader as 👤 Trader
    participant Web as 🌐 React Client
    participant GW as 🚪 API Gateway (PC 1)
    participant Notif as 🔔 Notification Service (PC 5 / Node.js)
    participant Store as 🔥 Firestore / In-Memory Store

    Trader->>Web: Views Navigation Bar (Bell Icon)
    Web->>GW: GET /api/v1/notifications?unreadOnly=true
    GW->>Notif: Forward request with X-User-Id header
    Notif->>Store: Query notifications WHERE userId = ? AND isRead = false
    Store-->>Notif: List of Unread Alerts (e.g., 2 items)
    Notif-->>GW: 200 OK { unreadCount: 2, notifications: [...] }
    GW-->>Web: 200 OK
    Web->>Web: Update Bell Badge to "2"

    Trader->>Web: Clicks Bell Icon -> Clicks "Mark All As Read"
    Web->>GW: POST /api/v1/notifications/mark-all-read
    GW->>Notif: Forward mark-all-read
    Notif->>Store: UPDATE notifications SET isRead = true WHERE userId = ?
    Notif-->>GW: 200 OK { success: true }
    GW-->>Web: 200 OK
    Web->>Web: Reset Bell Badge to "0"
```

---

## 6. Multi-PC Physical Deployment & Communication

### 6.1. Network IP Mapping Table
All 5 laptops are connected to the same subnet (e.g., `10.43.5.x` or `192.168.1.x`):

```
+---------------------------------------------------------------------------------+
|                                 WI-FI ROUTER / SWITCH                           |
|                                     10.43.5.1                                   |
+---------------------------------------------------------------------------------+
        |                    |                    |                    |
        | 10.43.5.202        | 10.43.5.228        | 10.43.5.131        | 10.43.5.228 (PC4/5)
+------------------+ +------------------+ +------------------+ +------------------+
|   PC 1 (Jenil)   | |   PC 2 (Jeel)    | |   PC 3 (Harsh)   | | PC 4/5(Kevl/Krish)|
| API Gateway:8080 | | Market Data:8082 | |  Order Svc:8083  | | Portfolio:8084   |
| Wallet Svc:8081  | | MongoDB:27017    | | MySQL:3306       | | Notification:8085|
| React Client:3000| +------------------+ +------------------+ +------------------+
| Kafka:9092/9093  |
| PostgreSQL:5432  |
| Eureka:8761      |
+------------------+
```

### 6.2. How Kafka Communicates Across Different Laptops
Apache Kafka on PC 1 uses **Dual Listeners** configured in [docker-compose.pc1.yml](file:///d:/stock-trading-platform/deploy/multi-pc/docker-compose.pc1.yml):
```yaml
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT,LAN:PLAINTEXT
KAFKA_LISTENERS: INTERNAL://0.0.0.0:29092,EXTERNAL://0.0.0.0:9092,LAN://0.0.0.0:9093
KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:29092,EXTERNAL://localhost:9092,LAN://${PC1_IP}:9093
```
- **Internal containers on PC 1** communicate via `kafka:29092`.
- **Remote PCs (PC 2, PC 3, PC 4, PC 5)** communicate across LAN via `${PC1_IP}:9093` (e.g. `10.43.5.202:9093`).

---

## 7. Evaluator Q&A / Viva Defense Cheat Sheet

Be prepared to answer these questions during your evaluation:

### Q1: Why did you use 5 different languages? Isn't that over-engineering?
> **Answer**:  
> *"In enterprise financial systems, no single language is optimal for all domains. This is the definition of **Polyglot Microservices**:
> - **C++17 (Order Service)** was chosen because matching engines cannot tolerate the unpredictable 10-50ms Garbage Collection (GC) pauses inherent in Java, Python, or Go.
> - **Go (Market Data)** was selected for its ultra-lightweight goroutines, allowing thousands of concurrent stock tickers to simulate Brownian motion with minimal CPU and memory overhead.
> - **Java 21 / Spring Boot (Identity & Wallet)** was selected for battle-tested enterprise financial compliance, Spring Security, and strict transactional isolation with PostgreSQL.
> - **Python (Portfolio)** provides native vectorized mathematical libraries for Weighted Average Cost Basis and real-time P&L analytics.
> - **Node.js (Notification)** leverages asynchronous non-blocking event loops ideal for I/O-heavy alert fan-out without tying up computational threads."*

### Q2: Why did you choose an Orchestrated Saga over 2-Phase Commit (2PC) or a Choreographed Saga?
> **Answer**:  
> *"**Two-Phase Commit (2PC)** requires distributed locking across all participating databases over a network. If any machine has high latency or goes down, all database connections remain locked, destroying throughput and causing cascading failures.  
> **Choreographed Sagas** (where each service reacts to events without a coordinator) quickly become a 'spiderweb' of cyclic dependencies where it is nearly impossible to track where an order is in its lifecycle.  
> We selected an **Orchestrated Saga** with the C++ Order Service as coordinator. It gives us a centralized state machine to trace, audit, and trigger explicit compensating rollbacks if any downstream step fails."*

### Q3: How do you guarantee financial integrity and prevent rounding errors?
> **Answer**:  
> *"We enforce two non-negotiable financial invariants:
> 1. **Integer Arithmetic**: We completely banned IEEE-754 floating point numbers (`float`/`double`) for monetary balances across all 5 codebases. Every rupee is stored as an integer count of **paise** ($₹1.00 = 100\text{ paise}$).
> 2. **Double-Entry Append-Only Ledger**: The Wallet Service never performs blind balance overwrites (`UPDATE balance = 500`). Instead, it executes row-level pessimistic locking (`SELECT ... FOR UPDATE`), updates the balance, and simultaneously records an immutable entry in the `ledger_entries` audit table."*

### Q4: What happens if PC 3 (Order Service) crashes after reserving money on PC 1?
> **Answer**:  
> *"Every cash reservation has a **Time-To-Live (TTL)**. If the Order Service crashes before sending the `/capture` confirmation, an automated background reaper task in the Wallet Service identifies expired, unconfirmed reservations and executes a compensating release, unlocking the trader's funds automatically."*

### Q5: What is the Dual-Write Problem, and how does your Transactional Outbox solve it?
> **Answer**:  
> *"If an application writes to a SQL database and then publishes to Kafka in separate steps, one of the two will eventually fail (e.g., database commits, but network to Kafka dies). This leaves the system in an inconsistent state.  
> Our C++ Order Service solves this using the **Transactional Outbox Pattern**: both the trade execution and the Kafka event record are inserted inside the **exact same ACID database transaction** in MySQL. A separate Outbox Relay process reads committed outbox messages and reliably publishes them to Kafka with at-least-once delivery semantics."*

### Q6: Why did you use Redis for the Portfolio Service instead of querying MySQL?
> **Answer**:  
> *"This implements the **CQRS (Command Query Responsibility Segregation)** pattern. The write-path (Order Service) requires transactional relational consistency in MySQL. However, traders refresh their portfolio dashboards constantly. Running complex aggregations (`SUM(qty * price)`, average cost calculations) on MySQL for thousands of concurrent users creates read-lock contention on the order table.  
> By consuming Kafka events and materializing the aggregated holdings into Redis in-memory hashes, portfolio queries execute in **$< 1.5\text{ ms}$** without touching the relational order database."*

### Q7: How do you prevent duplicate trades if a user double-clicks 'Submit Order'?
> **Answer**:  
> *"We implement **Distributed Idempotency**. When an order is submitted, the frontend attaches a unique `Idempotency-Key` (UUID) in the HTTP headers. The Order Service checks this key before processing. If a duplicate request arrives with the same key within the expiration window, the service rejects the second submission or returns the previously cached response without re-executing the trade."*

---

## 8. 5-Minute Live Evaluation Demo Script

Follow these steps for a demonstration during evaluation:

### Step 1: Show the Eureka Discovery Dashboard (30 seconds)
- Open browser to **`http://localhost:8761`**.
- **Show Evaluator**: Point out registered instances (`API-GATEWAY`, `IDENTITY-WALLET-SERVICE`, etc.) running in Eureka, proving microservices architecture.

### Step 2: User Registration & Virtual Capitalization (1 minute)
- Open browser to **`http://localhost:3000`**.
- Click **Register** $\rightarrow$ Enter details (e.g., `trader1@test.com`) $\rightarrow$ Click Submit.
- **Show Evaluator**: Direct attention to the top right wallet balance badge: **₹1,00,000.00**.
- **Technical Explanation**: Explain that the Java Wallet Service atomically created the user and generated an initial double-entry ledger grant in PostgreSQL.

### Step 3: Show High-Frequency Market Data Ticks (1 minute)
- Click on the **Watchlist / Stocks** tab.
- **Show Evaluator**: Notice the 35 NSE and US Equities flashing green/red as prices update live every 2 seconds.
- **Technical Explanation**: Explain that the Go service on PC 2 is running Geometric Brownian Motion calculations and streaming live market quotes from MongoDB.

### Step 4: Execute an Orchestrated Buy Order (1.5 minutes)
- Find **`RELIANCE`** or **`TCS`** in the table $\rightarrow$ Click **BUY**.
- Select **Order Type: MARKET** $\rightarrow$ Enter **Quantity: 5** $\rightarrow$ Click **Submit Order**.
- **Show Evaluator**:
  1. The order executes in **$< 40\text{ ms}$**.
  2. The wallet balance immediately decreases by the exact amount in paise.
  3. Navigate to **Orders Tab**: Show the executed order record with timestamp and fill price.
- **Technical Explanation**: Walk the evaluator through the 4-PC sequence: Gateway $\rightarrow$ C++ Drogon (PC3) $\rightarrow$ Go Market Data quote (PC2) $\rightarrow$ Java Wallet reservation (PC1) $\rightarrow$ MySQL commit $\rightarrow$ Kafka event publish.

### Step 5: Verify CQRS Portfolio & Notification Alert (1 minute)
- Click on the **Portfolio Tab**:
  - Show the 5 shares of `RELIANCE` appearing with Average Buy Price, Current Value, and live unrealized P&L calculated in Python and retrieved from Redis in $< 2\text{ ms}$.
- Click the **Bell Icon (Notification Drawer)** in the top navigation bar:
  - Show the unread notification badge reading *"1"*.
  - Open drawer: Show alert *"Bought 5 shares of RELIANCE at ₹2,790.93"*.
  - Click *"Mark all as read"*: Show badge count reset to 0.

---

*Authored by the Stock Trading Platform Engineering Team*  
*Lead: Jenil Soni (23BCE119) • Harsh Thakkar (23BCE091) • Jeel Dhamsaniya (23BCE116) • Kevl Dholakiya (23BCE066) • Krish Chothani (23BCE151)*
