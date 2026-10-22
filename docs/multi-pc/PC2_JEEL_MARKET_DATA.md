# 💻 PC 2 Setup Guide: Market Data Service & Live Stock Simulator

**Assignee**: Jeel Dhamsaniya (23BCE116)  
**Target Operating System**: macOS (or Linux/Windows)  
**Role**: Market Data Provider  

---

## 📦 What Runs on PC 2?

1. **Database**:
   - `stp-pc2-mongodb` (MongoDB 7.0 on port `27017` with pre-seeded stocks)
2. **Microservice**:
   - `stp-pc2-market-data` (Go 1.22 / Gin & gRPC server on ports `8082` and `50051`)

---

## 🌐 Which IPs Does PC 2 Need?

PC 2 needs **no external IP addresses**!  
The Market Data Service and MongoDB are 100% self-contained.  
PC 2 only needs to:
1. Know its **own LAN IP** (e.g. `192.168.1.102`).
2. Share its IP with **Jenil (PC 1)**, **Harsh (PC 3)**, and **Kevl (PC 4)** so their services can connect to port `8082`.

---

## 🚀 Step-by-Step Execution Instructions

### Step 1: Find Your LAN IP
On macOS / Linux Terminal:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
*(On Windows: run `ipconfig`).*  
Copy your IP (e.g. `192.168.1.102`) and share it with the team.

### Step 2: Clone the Repository
```bash
git clone https://github.com/jenilsoni01/stock-trading-platform.git
cd stock-trading-platform
```

### Step 3: Start PC 2 Stack
Run directly with Docker (no Go or MongoDB installation required):
```bash
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc2.yml up -d --build
```

### Step 4: Verify That Everything is Running
Check container status:
```bash
docker ps
```
You should see:
- `stp-pc2-mongodb` (healthy)
- `stp-pc2-market-data` (Up on ports `8082`, `50051`)

Test HTTP stock quotes from your terminal or browser:
```bash
curl http://localhost:8082/api/v1/stocks
```
You should receive a JSON array containing stock symbols (`RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `TATAMOTORS`, etc.) with simulated live prices!

---

## 🛑 How to Stop or Restart
To stop:
```bash
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc2.yml down
```
To view live price ticker simulation logs:
```bash
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc2.yml logs -f market-data-service
```
