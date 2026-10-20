# 💻 PC 5 Setup Guide: Notification & Alerting Service

**Assignee**: Krish Chothani (23BCE151)  
**Target Operating System**: Windows (or Linux/macOS)  
**Role**: Asynchronous User Notifications & Event Logging  

---

## 📦 What Runs on PC 5?

1. **Database**:
   - `stp-pc5-firestore` (Google Cloud SDK Firestore Emulator on port `8088`)
2. **Microservice**:
   - `stp-pc5-notification-service` (Node.js 20 / Express on port `8085`)

---

## 🌐 Which IPs Does PC 5 Need?

PC 5 communicates with 1 external machine:
- **`PC1_IP` (Jenil)**: 
  - To consume order and trade lifecycle events from Kafka at `PC1_IP:9093`.

---

## 🚀 Step-by-Step Execution Instructions

### Step 1: Find Your LAN IP
Open PowerShell on PC 5:
```powershell
ipconfig
```
Locate your **IPv4 Address** (e.g. `192.168.1.105`) and share it with Jenil (PC 1) and Harsh (PC 3).

### Step 2: Clone the Repository & Configure `.env`
```powershell
git clone https://github.com/jenilsoni01/stock-trading-platform.git
cd stock-trading-platform
```

Create `.env` from template:
```powershell
copy deploy\multi-pc\.env.multi-pc.example .env
```

Open `.env` and set:
```env
PC1_IP=192.168.1.101      # Jenil's IP (Kafka Broker)
PC2_IP=192.168.1.102      # Jeel's IP
PC3_IP=192.168.1.103      # Harsh's IP
PC4_IP=192.168.1.104      # Kevl's IP
PC5_IP=192.168.1.105      # YOUR IP
```

### Step 3: Start PC 5 Stack
Run directly with Docker (no Node.js, npm, or gcloud CLI needed on host):
```powershell
docker compose -f deploy/multi-pc/docker-compose.pc5.yml up -d --build
```

### Step 4: Verify That Everything is Running
Check container status:
```powershell
docker ps
```
You should see:
- `stp-pc5-firestore` (healthy on port `8088`)
- `stp-pc5-notification-service` (Up on port `8085`)

Test the Notification Service health:
```powershell
curl http://localhost:8085/health
```
*(Returns `{"status": "ok"}`)*

---

## 🛑 How to Stop or Restart
To stop:
```powershell
docker compose -f deploy/multi-pc/docker-compose.pc5.yml down
```
To view live notification consumption logs:
```powershell
docker compose -f deploy/multi-pc/docker-compose.pc5.yml logs -f notification-service
```
