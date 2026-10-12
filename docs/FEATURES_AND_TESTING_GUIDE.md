# 📊 Stock Trading Platform — Features & Verification Guide

This document outlines all features implemented across the Stock Trading Platform and provides a step-by-step verification guide to test every component via the Web UI and REST APIs.

---

## 🏛️ System Architecture & Feature Matrix

The platform is built as an event-driven, distributed microservices architecture:

| Service | Technology | Port | Database / Storage | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Web Client** | Next.js / React | `3000` | LocalStorage (JWT) | Interactive trading UI, live watchlist, order form, portfolio, wallet |
| **API Gateway** | Spring Cloud Gateway | `8080` | — | Single entry point, JWT verification, service routing, CORS |
| **Identity & Wallet** | Java 21 / Spring Boot | `8081` | PostgreSQL + Flyway | Auth (JWT), User profiles, Double-entry wallet, Integer paise ledger |
| **Market Data** | Go 1.22 / Gin & gRPC | `8082`, `50051` | MongoDB | Real-time stock prices, random walk simulator, gRPC service |
| **Order Service** | C++17 / Drogon | `8083` | MySQL 8.0 | Saga orchestrator, Outbox pattern, Order placement, Trade execution |
| **Portfolio** | Python 3.11 / FastAPI | `8084` | Redis | Holdings tracking, Real-time P&L calculations, Net worth summary |
| **Notification** | Node.js 20 / Express | `8085` | Google Firestore | Event consumer, Notification history, Real-time alerts stream |
| **Service Registry** | Netflix Eureka | `8761` | In-Memory | Microservice registration and dynamic discovery |
| **Message Broker** | Apache Kafka | `9092` | Zookeeper | Distributed event bus (`orders`, `trades.executed`, `notifications`) |

---

## 🌟 Complete Feature Breakdown

### 1. Identity & Wallet Service (Java 21 / Spring Boot)
- **User Authentication**: Secure user registration and login with BCrypt password hashing and JWT issuance.
- **Double-Entry Wallet Ledger**: Financial-grade ledger tracking credits and debits with strict zero-sum auditing.
- **Integer Paise Representation**: All balances, deposits, and prices are stored strictly in integer paise (₹1 = 100 paise) to avoid floating-point math bugs.
- **Saga Fund Reservation**: Ability to lock/reserve balance when a buy order is placed, and automatically release or commit it once the order executes or fails.
- **Flyway Database Migrations**: Automated versioned schema management (`V1__init_schema.sql`, `V2__add_audit_indexes.sql`).

### 2. Market Data Service (Go 1.22 / Gin & gRPC)
- **10 Core Stock Tickers**: Pre-seeded Indian & global market stocks (`RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `ICICIBANK`, `TATAMOTORS`, `SBIN`, `BHARTIARTL`, `ITC`, `WIPRO`).
- **Live Price Simulation**: Automatic background market simulator running a geometric Brownian random walk to update prices realistically every few seconds.
- **Dual Protocol Support**:
  - REST API (`GET /api/v1/stocks`)
  - Ultra-fast gRPC endpoint on port `50051` for inter-service communication.
- **WebSocket Price Streaming**: Push-based live price updates to the web client.

### 3. Order Service & Distributed Saga Orchestrator (C++17 / Drogon)
- **Order Types**: Supports `MARKET` and `LIMIT` orders for both `BUY` and `SELL` actions.
- **Distributed Saga Orchestration**: Coordinates distributed multi-step transactions across independent databases:
  1. *Step 1*: Reserve funds in Wallet Service (PostgreSQL).
  2. *Step 2*: Fetch real-time market price from Market Data Service (Go / MongoDB).
  3. *Step 3*: Create order record in MySQL with state `ACCEPTED` / `EXECUTING`.
  4. *Step 4*: Record executed trade in MySQL, commit wallet funds, and emit `trades.executed` event to Kafka.
  5. *Compensation*: If funds are insufficient or stock is invalid, automatically roll back wallet reservation and mark order as `REJECTED`.
- **Idempotency Protection**: Ensures duplicate requests (using `Idempotency-Key` HTTP header) never result in duplicate orders or double-charging.
- **Transactional Outbox Pattern**: Asynchronously publishes domain events to Kafka without distributed two-phase commit locking.

### 4. Portfolio Service (Python 3.11 / FastAPI)
- **Holdings Management**: Aggregates all user stock positions (quantity, average buy price).
- **Real-Time P&L & Net Worth**: Dynamically calculates unrealized Profit & Loss based on live stock prices.
- **Low-Latency Redis Cache**: Caches user holdings in Redis for sub-millisecond retrieval.
- **Kafka Event Consumer**: Automatically listens to `trades.executed` topic and updates positions instantly.

### 5. Notification Service (Node.js 20 / Express)
- **Real-Time Event Stream**: Streams notifications to users via Server-Sent Events (SSE).
- **Multi-Event Alerts**: Notifies users on Order Created, Order Executed, Order Rejected, and Wallet Balance Changes.
- **Firestore Persistence**: Stores notification history for historical review.

---

## 🧪 Step-by-Step Testing & Verification Guide

### Path A: Verification via the Web UI (Browser)

1. Open **`http://localhost:3000`** in your browser (or click port 3000 in Codespaces).
2. **Register a User**:
   - Click **Register** on the top right.
   - Enter `Username: trader1`, `Email: trader1@test.com`, `Password: Password123!`, `Full Name: Trader One`.
   - Submit. You will be logged in and issued a JWT token.
3. **Deposit Funds into Wallet**:
   - Navigate to the **Wallet** tab.
   - Click **Deposit Funds**. Enter `5000000` paise (₹50,000.00).
   - Verify your wallet balance updates immediately.
4. **View Live Market Watchlist**:
   - Go to **Market Watch** tab.
   - Observe live prices for `RELIANCE`, `TCS`, `INFY`, etc., fluctuating in real-time.
5. **Place a Buy Order**:
   - Click on `RELIANCE`.
   - Select **BUY**, Order Type: **MARKET**, Quantity: `5`.
   - Click **Submit Order**.
   - Watch the Saga transition: `CREATED` $\rightarrow$ `VALIDATING` $\rightarrow$ `EXECUTED`.
6. **Check Portfolio**:
   - Go to **Portfolio** tab.
   - Observe `5 shares of RELIANCE` with Average Price, Current Price, and live P&L.
7. **View Notifications**:
   - Click the **Bell Icon** on top.
   - See notifications for "Deposit Successful" and "Order Executed for RELIANCE".

---

### Path B: Verification via Terminal (cURL / PowerShell)

You can run these commands from your terminal or Codespaces:

#### 1. Check Service Health
```bash
# 1. Identity & Wallet Service
curl -s http://localhost:8081/actuator/health

# 2. Market Data Service
curl -s http://localhost:8082/health

# 3. Order Service
curl -s http://localhost:8083/health

# 4. Portfolio Service
curl -s http://localhost:8084/health

# 5. Notification Service
curl -s http://localhost:8085/health
```
*Expected response for all:* `{"status":"UP"}`

---

#### 2. Register & Login (Identity Service)
```bash
# Register User
curl -s -X POST http://localhost:8081/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"trader1","email":"trader1@test.com","password":"Password123!","fullName":"Trader One"}'
```
*Save the returned `"token"` for subsequent requests.*

```bash
# Set your token variable
TOKEN="<PASTE_TOKEN_HERE>"
```

---

#### 3. Deposit Money into Wallet
```bash
# Deposit ₹10,000 (1,000,000 paise)
curl -s -X POST http://localhost:8081/api/v1/wallet/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountPaise": 1000000, "referenceId": "DEP-001"}'
```

```bash
# Check Balance
curl -s http://localhost:8081/api/v1/wallet/balance \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 4. Query Market Data Stocks
```bash
# Fetch all stock prices
curl -s http://localhost:8082/api/v1/stocks

# Fetch specific stock (RELIANCE)
curl -s http://localhost:8082/api/v1/stocks/RELIANCE
```

---

#### 5. Place an Order (Order Service & Saga Execution)
```bash
# Place Market Buy Order for 2 shares of RELIANCE
curl -s -X POST http://localhost:8083/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ORD-REQ-001" \
  -d '{"symbol":"RELIANCE","side":"BUY","orderType":"MARKET","quantity":2}'
```

```bash
# View All Placed Orders
curl -s http://localhost:8083/api/v1/orders \
  -H "Authorization: Bearer $TOKEN"

# View Executed Trades
curl -s http://localhost:8083/api/v1/trades \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 6. Check Updated Portfolio & Holdings
```bash
# View Portfolio Holdings & P&L
curl -s http://localhost:8084/api/v1/portfolio \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 7. View Notification History
```bash
# View User Notifications
curl -s http://localhost:8085/api/v1/notifications \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🛡️ Edge Cases & Fault Tolerance Tested
1. **Zero Floating-Point Drift**: All currency calculations use exact integer paise arithmetic.
2. **Idempotency Protection**: Submitting an order twice with the same `Idempotency-Key` returns the cached response and prevents duplicate orders.
3. **Insufficient Funds Handling**: Placing an order with insufficient wallet balance triggers the Saga rollback and marks the order as `REJECTED` with zero wallet deduction.
4. **Crash-Safe Outbox Relay**: If Kafka is temporarily unavailable, messages remain `PENDING` in the MySQL outbox table and are retried automatically until delivered.
