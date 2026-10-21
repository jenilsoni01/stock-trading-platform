# 💻 PC 1 Setup Guide: Host, API Gateway, Eureka, Identity & Wallet, Web Client

**Assignee**: Jenil Soni (23BCE119 - Lead)  
**Target Operating System**: Windows (or Linux/macOS)  
**Role**: Central Host & Orchestrator  

---

## 📦 What Runs on PC 1?

1. **Databases & Infrastructure**:
   - `stp-pc1-postgres` (PostgreSQL 16 on port `5432`)
   - `stp-pc1-zookeeper` (Zookeeper on port `2181`)
   - `stp-pc1-kafka` (Kafka Broker on port `9092` internal, `9093` LAN)
   - `stp-pc1-kafka-init` (Auto-creates all 5 Kafka topics)
2. **Microservices & Web Application**:
   - `stp-pc1-eureka` (Eureka Service Discovery on port `8761`)
   - `stp-pc1-identity-wallet` (Identity & Wallet Service on port `8081`)
   - `stp-pc1-gateway` (Spring Cloud API Gateway on port `8080`)
   - `stp-pc1-web-client` (React/Vite Trading UI on port `3000`)

---

## 🌐 Which IPs Does PC 1 Need?

PC 1 needs **all 5 IP addresses**:
- **Its own LAN IP (`PC1_IP`)**: Kafka needs this so it advertises `192.168.x.x:9093` to the other 4 PCs.
- **`PC2_IP`**: For the API Gateway to route Market Data requests (`/api/v1/stocks/**`) to PC 2.
- **`PC3_IP`**: For the API Gateway to route Order requests (`/api/v1/orders/**`, `/api/v1/trades/**`) to PC 3.
- **`PC4_IP`**: For the API Gateway to route Portfolio requests (`/api/v1/portfolio/**`) to PC 4.
- **`PC5_IP`**: For the API Gateway to route Notification requests (`/api/v1/notifications/**`) to PC 5.

---

## 🚀 Step-by-Step Execution Instructions

### Step 1: Find Your LAN IP
Open PowerShell on PC 1:
```powershell
ipconfig
```
Locate your **IPv4 Address** (e.g. `192.168.1.101`). Share this IP with all 4 teammates!

### Step 2: Clone & Configure `.env`
Clone the GitHub repository:
```powershell
git clone https://github.com/jenilsoni01/stock-trading-platform.git
cd stock-trading-platform
```

Create `.env` from the template:
```powershell
copy deploy\multi-pc\.env.multi-pc.example .env
```

Open `.env` in Notepad or VS Code and set:
```env
PC1_IP=192.168.1.101      # YOUR IP
PC2_IP=192.168.1.102      # Jeel's IP
PC3_IP=192.168.1.103      # Harsh's IP
PC4_IP=192.168.1.104      # Kevl's IP
PC5_IP=192.168.1.105      # Krish's IP
```

### Step 3: Configure Windows Firewall (Crucial!)
Allow inbound connections to Docker ports so your teammates can reach Kafka, Gateway, and Wallet Service:
```powershell
New-NetFirewallRule -DisplayName "STP Platform Dev Ports" -Direction Inbound -LocalPort 3000,5432,8080,8081,8761,9092,9093 -Protocol TCP -Action Allow
```

### Step 4: Start PC 1 Stack
Run:
```powershell
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc1.yml up -d --build
```

### Step 5: Verify That Everything is Healthy
Check container statuses:
```powershell
docker ps
```
You should see 8 containers running (`stp-pc1-web-client`, `stp-pc1-gateway`, `stp-pc1-identity-wallet`, `stp-pc1-eureka`, `stp-pc1-kafka`, `stp-pc1-zookeeper`, `stp-pc1-postgres`).

Verify the services in your browser:
- **Trading Web Application**: `http://localhost:3000` or `http://10.43.5.202:3000`
- **API Gateway Health**: `http://localhost:8080/actuator/health`
- **Eureka Dashboard**: `http://localhost:8761`
- **Identity Service**: `http://localhost:8081/actuator/health`

---

## 🛑 How to Stop or Restart
To stop:
```powershell
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc1.yml down
```
To view logs:
```powershell
docker compose --env-file .env -f deploy/multi-pc/docker-compose.pc1.yml logs -f api-gateway
```
