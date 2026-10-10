#!/usr/bin/env bash
# ============================================
# GitHub Codespaces One-Click Startup Script
# ============================================
set -e

echo "🚀 Initializing Stock Trading Platform in Codespaces..."

# 1. Ensure .env exists
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
fi

# 2. Start Infrastructure Databases & Message Brokers
echo "📦 Starting Infrastructure Containers (PostgreSQL, MySQL, MongoDB, Redis, Kafka, Zookeeper)..."
docker compose -f deploy/compose/compose.infra.yml up -d

echo "⏳ Waiting for databases to become healthy (15s)..."
sleep 15

# 3. Build and Start Microservices
echo "🔨 Building and Starting All 5 Application Services..."
docker compose -f deploy/compose/compose.apps.yml up -d --build

echo ""
echo "=========================================================="
echo "🎉 ALL SERVICES STARTED SUCCESSFULLY IN CODESPACES!"
echo "=========================================================="
echo "🌐 Web Client:             http://localhost:3000"
echo "🌐 API Gateway:            http://localhost:8080"
echo "🔐 Identity & Wallet (Java): http://localhost:8081/actuator/health"
echo "📈 Market Data (Go):       http://localhost:8082/health"
echo "📋 Order Service (C++):    http://localhost:8083/health"
echo "💼 Portfolio (Python):     http://localhost:8084/health"
echo "🔔 Notification (Node.js): http://localhost:8085/health"
echo "🔍 Eureka Registry:        http://localhost:8761"
echo "=========================================================="
