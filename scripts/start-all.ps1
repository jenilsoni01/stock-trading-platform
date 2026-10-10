# ========================================================
# Stock Trading Platform - Multi-Environment Startup Script
# Automatically handles Windows Docker Desktop and WSL Docker
# ========================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Starting Stock Trading Platform Microservices   " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Detect Docker environment
$isWslDocker = $false
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    if (Get-Command wsl -ErrorAction SilentlyContinue) {
        $isWslDocker = $true
        Write-Host "Detected Docker inside WSL2 environment." -ForegroundColor Green
    }
}

if ($isWslDocker) {
    Write-Host "`n[1/2] Starting Infrastructure via WSL Docker..." -ForegroundColor Yellow
    wsl sh -c "cd /mnt/d/stock-trading-platform && docker compose -f deploy/compose/compose.infra.yml up -d"
    
    Write-Host "Waiting for databases and Kafka to be healthy..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 15

    Write-Host "`n[2/2] Building and starting Microservices via WSL Docker..." -ForegroundColor Yellow
    wsl sh -c "cd /mnt/d/stock-trading-platform && docker compose -f deploy/compose/compose.infra.yml -f deploy/compose/compose.apps.yml up --build -d"
} else {
    Write-Host "`n[1/2] Starting Infrastructure services..." -ForegroundColor Yellow
    docker compose -f deploy/compose/compose.infra.yml up -d

    Write-Host "Waiting for databases and Kafka to be healthy..." -ForegroundColor DarkGray
    Start-Sleep -Seconds 15

    Write-Host "`n[2/2] Building and starting Microservices..." -ForegroundColor Yellow
    docker compose -f deploy/compose/compose.infra.yml -f deploy/compose/compose.apps.yml up --build -d
}

Write-Host "`n=================================================" -ForegroundColor Green
Write-Host " Platform Started Successfully!                  " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host " • Web Client:       http://localhost:3001" -ForegroundColor White
Write-Host " • API Gateway:      http://localhost:8080" -ForegroundColor White
Write-Host " • Eureka Server:    http://localhost:8761" -ForegroundColor White
Write-Host " • Identity Service: http://localhost:8081" -ForegroundColor White
Write-Host " • Market Data:      http://localhost:8082" -ForegroundColor White
Write-Host " • Order Service:    http://localhost:8083" -ForegroundColor White
Write-Host " • Portfolio:        http://localhost:8084" -ForegroundColor White
Write-Host " • Notification:     http://localhost:8085" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Green
