# Windows Single-PC Setup Guide

This guide details how to set up, build, test, and run the complete **Stock Trading Platform** on a Windows development computer using IntelliJ IDEA Ultimate and Docker Desktop.

---

## 📋 Prerequisites Checklist

| Component | Minimum Version | Purpose | Installation Method |
|---|---|---|---|
| **Docker Desktop** | 4.30+ (WSL2 backend) | Runs databases, Kafka, and containerized microservices | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **IntelliJ IDEA Ultimate** | 2023.3+ | Java IDE with bundled Maven & JDK manager | [jetbrains.com/idea](https://www.jetbrains.com/idea/) |
| **JDK (Java Development Kit)** | Java 17 LTS | For Identity & Wallet Service, Gateway, Eureka | Downloaded directly inside IntelliJ or via Winget |
| **Python** (Optional for local dev) | 3.11+ | For Portfolio Service local execution | [python.org](https://www.python.org/downloads/) |
| **Node.js** (Optional for local dev) | 20 LTS | For Web Client and Notification Service | [nodejs.org](https://nodejs.org/) |
| **Go** (Optional for local dev) | 1.22+ | For Market Data Service local execution | [go.dev](https://go.dev/dl/) |
| **C++ / CMake** | **Not Required on Host** | Order Service builds in a Linux Docker container | Included in Dockerfile multi-stage build |

---

## 🔍 Diagnostic Script

Run the automated environment check:
```powershell
.\scripts\verify-prerequisites.ps1
```

---

## ☕ Java & IntelliJ IDEA Configuration (Maven Wrapper)

### 1. Configure JDK 17 in IntelliJ
1. Open IntelliJ IDEA.
2. Open `d:\stock-trading-platform` or the individual subproject directory (e.g. `apps/identity-wallet-service`).
3. Go to **File → Project Structure → Project**.
4. Under **SDK**, select **Add SDK → Download JDK...**:
   - Version: `17`
   - Vendor: `Eclipse Temurin (AdoptOpenJDK)` or `Amazon Corretto`
5. Set **Language Level** to `17 - Records, patterns, etc.`.

### 2. Maven Configuration (Zero Standalone Maven Required)
The project includes the official **Maven Wrapper** (`mvnw.cmd` and `.mvn/wrapper/`):
- To run Maven commands from PowerShell without installing Maven:
  ```powershell
  cd apps\identity-wallet-service
  .\mvnw.cmd clean package
  ```
- In IntelliJ IDEA:
  1. Open **Settings (Ctrl+Alt+S) → Build, Execution, Deployment → Build Tools → Maven**.
  2. Set **Maven home path** to `Use Maven wrapper` (or `Bundled (Maven 3)`).
  3. Under **Runner**, ensure **JRE** points to `Project SDK (JDK 17)`.

---

## 🐍 Python Local Environment Setup (`.venv`)

For working locally on the **Portfolio Service** without polluting your global Python environment:

```powershell
cd apps\portfolio-service

# 1. Create project-local virtual environment
python -m venv .venv

# 2. Activate virtual environment in PowerShell
.\.venv\Scripts\Activate.ps1

# (If PowerShell blocks script execution, run: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass)

# 3. Upgrade pip and install pinned dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# 4. Run Portfolio tests
pytest tests/ -v
```

---

## 🐹 Go Setup (Market Data Service)

If developing the Market Data Service directly on the Windows host (outside Docker):

### 1. Installation
- Download the Windows MSI installer from [go.dev/dl](https://go.dev/dl/) or install via Winget:
  ```powershell
  winget install GoLang.Go.1.22
  ```
- Verify PATH:
  ```powershell
  go version
  ```

### 2. Build & Test
```powershell
cd apps\market-data-service
go test ./... -v
go run ./cmd/server
```

---

## ⚡ C++ Order Service (Containerized Linux Build)

The C++ Order Service uses Drogon, OpenSSL, and MySQL client libraries. **You do NOT need Visual Studio C++ (MSVC) or CMake installed on Windows.**

The multi-stage [`Dockerfile`](file:///d:/stock-trading-platform/apps/order-service/Dockerfile) builds the service in an isolated Ubuntu container:
```powershell
# Build and run the C++ Order Service container
docker compose -f deploy/compose/compose.infra.yml -f deploy/compose/compose.apps.yml build order-service
```

---

## 🚀 Execution Modes

### Mode A: Full Stack in Docker (Zero Host Dependencies)
Run all 5 polyglot services, API Gateway, Eureka Discovery, Databases, and Kafka with one command:
```powershell
.\scripts\start-all.ps1
```
Open **[http://localhost:3001](http://localhost:3001)** to use the application.

### Mode B: Hybrid Local Development (Databases in Docker + Services in IDE)
1. Start only infrastructure (Databases, Kafka, Redis):
   ```powershell
   docker compose -f deploy/compose/compose.infra.yml up -d
   ```
2. Run your specific service in IntelliJ / VS Code / terminal.
3. Access services at their designated local ports (`8081`, `8082`, `8083`, `8084`, `8085`).
