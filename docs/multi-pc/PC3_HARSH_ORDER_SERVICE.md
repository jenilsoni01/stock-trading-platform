# 💻 PC 3 Setup Guide: Order Service & Matching Engine

**Assignee**: Harsh Thakkar (23BCE091)  
**Target Operating System**: Windows (or Linux/macOS)  
**Role**: High-Performance Order Execution & Saga Orchestration  

---

## 📦 What Runs on PC 3?

1. **Database**:
   - `stp-pc3-mysql` (MySQL 8.0 on port `3306` with automatic schema initialization)
2. **Microservice**:
   - `stp-pc3-order-service` (C++ 17 / Drogon asynchronous engine on port `8083`)

---

## 🌐 Which IPs Does PC 3 Need?

PC 3 communicates with 4 external machines:
- **`PC1_IP` (Jenil)**: 
  - To call Wallet Service (`http://PC1_IP:8081/api/v1/wallet/reserve`) to reserve funds before executing BUY orders.
  - To connect to the Kafka Broker (`PC1_IP:9093`) for event publishing.
- **`PC2_IP` (Jeel)**: 
  - To call Market Data Service (`http://PC2_IP:8082/api/v1/stocks/{symbol}/quote`) to obtain the live market price for matching.
- **`PC4_IP` (Kevl)**: 
  - To dispatch trade projections to Portfolio Service (`http://PC4_IP:8084/api/v1/portfolio/trades`).
- **`PC5_IP` (Krish)**: 
  - To trigger real-time trade notifications to Notification Service (`http://PC5_IP:8085/api/v1/notifications`).

---

## 🚀 Step-by-Step Execution Instructions

### Step 1: Find Your LAN IP
Open PowerShell on PC 3:
```powershell
ipconfig
```
Locate your **IPv4 Address** (e.g. `192.168.1.103`) and share it with Jenil (PC 1).

### Step 2: Clone the Repository & Configure `.env`
Clone the GitHub repository:
```powershell
git clone https://github.com/jenilsoni01/stock-trading-platform.git
cd stock-trading-platform
```

Create `.env` from template:
```powershell
copy deploy\multi-pc\.env.multi-pc.example .env
```

Open `.env` and set the IP addresses:
```env
PC1_IP=192.168.1.101      # Jenil's IP (Host / Wallet / Kafka)
PC2_IP=192.168.1.102      # Jeel's IP (Market Data)
PC3_IP=192.168.1.103      # YOUR IP
PC4_IP=192.168.1.104      # Kevl's IP (Portfolio)
PC5_IP=192.168.1.105      # Krish's IP (Notification)
```

### Step 3: Start PC 3 Stack
Run with Docker (no C++ compiler, CMake, or MySQL needed on host):
```powershell
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc3.yml up -d --build
```

### Step 4: Verify That Everything is Running
Check container status:
```powershell
docker ps
```
You should see:
- `stp-pc3-mysql` (healthy on port `3306`)
- `stp-pc3-order-service` (Up on port `8083`)

Test the Order Service health:
```powershell
curl http://localhost:8083/health
```
*(Returns `OK`)*

Test fetching orders:
```powershell
curl http://localhost:8083/api/v1/orders
```
*(Returns `[]` initially)*

---

## 🛑 How to Stop or Restart
To stop:
```powershell
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc3.yml down
```
To view live matching engine and saga execution logs:
```powershell
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc3.yml logs -f order-service
```
