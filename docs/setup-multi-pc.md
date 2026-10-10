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
    subgraph HostPC ["Host Machine (Jenil - Windows PC)"]
        Infra["Docker Compose Infrastructure<br/>• PostgreSQL (5432) • MySQL (3306) • MongoDB (27017)<br/>• Redis (6379) • Kafka (9092/9093) • Firestore (8088)"]
        Gateway["API Gateway (Port 8080)"]
        Eureka["Eureka Server (Port 8761)"]
        Identity["Identity & Wallet Service (Port 8081)"]
    end

    subgraph DevPC1 ["Dev Machine 2 (Jeel - macOS)"]
        MarketSvc["Market Data Service (Go)<br/>Connects to Mongo at LAN_IP:27017"]
    end

    subgraph DevPC2 ["Dev Machine 3 (Harsh - Windows)"]
        OrderSvc["Order Service (C++ Docker)<br/>Connects to MySQL & Market Data"]
    end

    subgraph DevPC3 ["Dev Machine 4 (Kevl - macOS)"]
        PortfolioSvc["Portfolio Service (Python .venv)<br/>Consumes Kafka at LAN_IP:9093"]
    end

    subgraph DevPC4 ["Dev Machine 5 (Krish - Windows)"]
        NotificationSvc["Notification Service (Node.js)<br/>Consumes Kafka at LAN_IP:9093"]
    end

    DevPC1 -->|LAN IP| Infra
    DevPC2 -->|LAN IP| Infra
    DevPC3 -->|LAN IP| Infra
    DevPC4 -->|LAN IP| Infra
```

---

## ⚙️ Multi-PC Configuration Steps

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
