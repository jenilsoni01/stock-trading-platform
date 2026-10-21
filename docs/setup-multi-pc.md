# Multi-PC Distributed Team Setup Guide

This guide details how the 5 team members run, test, and integrate their assigned microservices across multiple development machines (Windows and macOS) over a shared local area network (LAN) or Git workflow.

---

## 👥 Team Assignments & Target OS

| Member | Roll No. | Service | Tech Stack | Target OS |
|---|---|---|---|---|
| **Jenil Soni** (Lead) | 23BCE119 | Identity & Wallet Service / Gateway | Java 17 (Maven) / Spring Boot | Windows |
| **Jeel Dhamsaniya** | 23BCE116 | Market Data Service | Go 1.22 / Gin / MongoDB | macOS |
| **Harsh Thakkar** | 23BCE091 | Order Service | C++ 17 / Drogon / MySQL | Windows |
| **Kevl Dholakiya** | 23BCE066 | Portfolio Service | Python 3.11 / FastAPI / Redis | macOS |
| **Krish Chothani** | 23BCE151 | Notification Service | Node.js 20 / Express / Firestore | Windows |

---

## 🌐 Network Architecture for Multi-PC Development

```mermaid
flowchart TD
    subgraph HostPC ["PC 1: Host Machine (Jenil - Windows PC)"]
        Infra["Shared Infrastructure<br/>• PostgreSQL (5432) • Kafka Broker (9092/9093)<br/>• Zookeeper (2181)"]
        Gateway["API Gateway (Port 8080)"]
        Eureka["Eureka Server (Port 8761)"]
        Identity["Identity & Wallet Service (Port 8081)"]
        WebClient["React Trading Terminal (Port 3000)"]
    end

    subgraph DevPC1 ["PC 2: Market Data (Jeel - macOS)"]
        MarketSvc["Market Data Service (Go / Gin)<br/>Ports 8082, 50051"]
        MongoDB[("MongoDB 7.0 (27017)")]
        MarketSvc --- MongoDB
    end

    subgraph DevPC2 ["PC 3: Order Engine (Harsh - Windows)"]
        OrderSvc["Order Service (C++ 17 / Drogon)<br/>Port 8083"]
        MySQL[("MySQL 8.0 (3306)")]
        OrderSvc --- MySQL
    end

    subgraph DevPC3 ["PC 4: Portfolio CQRS (Kevl - macOS)"]
        PortfolioSvc["Portfolio Service (Python 3.11 / FastAPI)<br/>Port 8084"]
        Redis[("Redis 7.4 (6379)")]
        PortfolioSvc --- Redis
    end

    subgraph DevPC4 ["PC 5: Notifications (Krish - Windows)"]
        NotificationSvc["Notification Service (Node.js 20)<br/>Port 8085"]
        Firestore[("Firestore Emulator (8088)")]
        NotificationSvc --- Firestore
    end

    %% Gateway to each microservice
    Gateway -->|Localhost:8081| Identity
    Gateway -->|PC2_IP:8082| MarketSvc
    Gateway -->|PC3_IP:8083| OrderSvc
    Gateway -->|PC4_IP:8084| PortfolioSvc
    Gateway -->|PC5_IP:8085| NotificationSvc

    %% Inter-service dependencies
    OrderSvc -->|PC1_IP:8081| Identity
    OrderSvc -->|PC2_IP:8082| MarketSvc
    OrderSvc -->|PC4_IP:8084| PortfolioSvc
    OrderSvc -->|PC5_IP:8085| NotificationSvc
    OrderSvc ==>|PC1_IP:9093| Infra

    PortfolioSvc -->|PC2_IP:8082| MarketSvc
    PortfolioSvc ==>|PC1_IP:9093| Infra
    NotificationSvc ==>|PC1_IP:9093| Infra
```

---

## ⚡ Zero-Toolchain Docker Compose Multi-PC Deployment (Recommended)

Each machine runs its assigned service and database inside Docker. See the dedicated guides in [`docs/multi-pc/`](multi-pc/README.md):
- **PC 1**: `docker compose -f deploy/multi-pc/docker-compose.pc1.yml up -d --build` ([PC 1 Guide](multi-pc/PC1_JENIL_GATEWAY.md))
- **PC 2**: `docker compose -f deploy/multi-pc/docker-compose.pc2.yml up -d --build` ([PC 2 Guide](multi-pc/PC2_JEEL_MARKET_DATA.md))
- **PC 3**: `docker compose -f deploy/multi-pc/docker-compose.pc3.yml up -d --build` ([PC 3 Guide](multi-pc/PC3_HARSH_ORDER_SERVICE.md))
- **PC 4**: `docker compose -f deploy/multi-pc/docker-compose.pc4.yml up -d --build` ([PC 4 Guide](multi-pc/PC4_KEVL_PORTFOLIO_SERVICE.md))
- **PC 5**: `docker compose -f deploy/multi-pc/docker-compose.pc5.yml up -d --build` ([PC 5 Guide](multi-pc/PC5_KRISH_NOTIFICATION_SERVICE.md))

---

### 1. Host Machine (Shared Infrastructure Provider)
1. Find your machine's LAN IP:
   - Windows: `ipconfig` (e.g. `192.168.1.100`)
2. Create or update `.env` in the root:
   ```env
   INFRA_HOST=192.168.1.100
   ```
3. Start the shared infrastructure:
   ```powershell
   docker compose -f deploy/compose/compose.infra.yml up -d
   ```
   *Note: Kafka will advertise `192.168.1.100:9093` to LAN participants automatically.*

### 2. Team Member Machines (Connecting to Shared Infra)
In each service's `.env` or run configuration, point to the host machine's LAN IP:

- **Market Data Service (Jeel / macOS)**:
  ```bash
  export MONGODB_URI="mongodb://md_service:dev_mongo_pass@192.168.1.100:27017/market_data_db?authSource=admin"
  go run ./cmd/server
  ```

- **Portfolio Service (Kevl / macOS)**:
  ```bash
  source .venv/bin/activate
  export REDIS_HOST="192.168.1.100"
  export KAFKA_BOOTSTRAP_SERVERS="192.168.1.100:9093"
  uvicorn app.main:app --port 8084
  ```

- **Notification Service (Krish / Windows)**:
  ```powershell
  $env:FIRESTORE_EMULATOR_HOST="192.168.1.100:8088"
  $env:KAFKA_BOOTSTRAP_SERVERS="192.168.1.100:9093"
  npm start
  ```

- **Order Service (Harsh / Windows)**:
  ```powershell
  $env:DB_HOST="192.168.1.100"
  $env:MARKET_DATA_URL="http://192.168.1.100:8082"
  $env:WALLET_SERVICE_URL="http://192.168.1.100:8081"
  docker compose -f deploy/compose/compose.apps.yml up order-service
  ```

---

## 🔒 Firewall & Security Troubleshooting

If a team member cannot connect to a service on the Host PC:
1. On the Windows Host PC, allow Docker ports in Windows Defender Firewall:
   ```powershell
   New-NetFirewallRule -DisplayName "STP Platform Dev Ports" -Direction Inbound -LocalPort 3306,5432,6379,8080-8088,8761,9092,9093,27017 -Protocol TCP -Action Allow
   ```
2. Test network connectivity from member's terminal:
   ```bash
   # On macOS / Linux
   nc -zv 192.168.1.100 8080
   
   # On Windows
   Test-NetConnection -ComputerName 192.168.1.100 -Port 8080
   ```
