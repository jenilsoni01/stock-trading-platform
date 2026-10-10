# ============================================
# Stock Trading Platform - Shutdown Script
# ============================================

Write-Host "Stopping all Stock Trading Platform containers..." -ForegroundColor Yellow

if (-not (Get-Command docker -ErrorAction SilentlyContinue) -and (Get-Command wsl -ErrorAction SilentlyContinue)) {
    wsl sh -c "cd /mnt/d/stock-trading-platform && docker compose -f deploy/compose/compose.infra.yml -f deploy/compose/compose.apps.yml down"
} else {
    docker compose -f deploy/compose/compose.infra.yml -f deploy/compose/compose.apps.yml down
}

Write-Host "All services stopped." -ForegroundColor Green
