# 💻 PC 4 Setup Guide: Portfolio Service & CQRS Read-Side Analytics

**Assignee**: Kevl Dholakiya (23BCE066)  
**Target Operating System**: macOS (or Linux/Windows)  
**Role**: Portfolio Analytics & Real-Time P&L Engine  

---

## 📦 What Runs on PC 4?

1. **Database**:
   - `stp-pc4-redis` (Redis 7.4 in-memory materialized view on port `6379`)
2. **Microservice**:
   - `stp-pc4-portfolio-service` (Python 3.11 / FastAPI on port `8084`)

---

## 🌐 Which IPs Does PC 4 Need?

PC 4 communicates with 2 external machines:
- **`PC1_IP` (Jenil)**: 
  - To consume `trades.executed` events from Kafka at `PC1_IP:9093`.
- **`PC2_IP` (Jeel)**: 
  - To query live prices from Market Data Service (`http://PC2_IP:8082`) for computing unrealized P&L.

---

## 🚀 Step-by-Step Execution Instructions

### Step 1: Find Your LAN IP
On macOS / Linux Terminal:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
*(On Windows: run `ipconfig`).*  
Copy your IP (e.g. `192.168.1.104`) and share it with Jenil (PC 1) and Harsh (PC 3).

### Step 2: Clone the Repository & Configure `.env`
```bash
git clone https://github.com/jenilsoni01/stock-trading-platform.git
cd stock-trading-platform
```

Create `.env` from template:
```bash
cp deploy/multi-pc/.env.multi-pc.example .env
```

Open `.env` and set:
```env
PC1_IP=192.168.1.101      # Jenil's IP (Kafka Broker)
PC2_IP=192.168.1.102      # Jeel's IP (Market Data)
PC3_IP=192.168.1.103      # Harsh's IP
PC4_IP=192.168.1.104      # YOUR IP
PC5_IP=192.168.1.105      # Krish's IP
```

### Step 3: Start PC 4 Stack
Run directly with Docker (no Python, pip, or Redis needed on host):
```bash
docker compose -f deploy/multi-pc/docker-compose.pc4.yml up -d --build
```

### Step 4: Verify That Everything is Running
Check container status:
```bash
docker ps
```
You should see:
- `stp-pc4-redis` (healthy on port `6379`)
- `stp-pc4-portfolio-service` (Up on port `8084`)

Test the Portfolio Service health:
```bash
curl http://localhost:8084/health
```
*(Returns `{"status": "UP"}`)*

---

## 🛑 How to Stop or Restart
To stop:
```bash
docker compose -f deploy/multi-pc/docker-compose.pc4.yml down
```
To view live CQRS projection and Kafka event consumer logs:
```bash
docker compose -f deploy/multi-pc/docker-compose.pc4.yml logs -f portfolio-service
```
