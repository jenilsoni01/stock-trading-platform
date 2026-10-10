# ========================================================
# Stock Trading Platform - Prerequisite Verification Script
# Supports both native Windows Docker Desktop and WSL Docker
# ========================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Stock Trading Platform - Environment Diagnostics       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

# Helper to determine docker invocation method
$dockerCmd = "docker"
$useWsl = $false

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "  + Windows Native Docker CLI found" -ForegroundColor Green
    $results += [PSCustomObject]@{ Component = "Docker Engine"; Status = "OK"; Details = "Windows Native Docker" }
} elseif (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "  Checking WSL Docker..." -ForegroundColor Yellow
    $wslCheck = wsl docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerCmd = "wsl docker"
        $useWsl = $true
        Write-Host "  + Docker found inside WSL2 ($wslCheck)" -ForegroundColor Green
        $results += [PSCustomObject]@{ Component = "Docker Engine"; Status = "OK (WSL)"; Details = "WSL2 Docker" }
    } else {
        Write-Host "  - Docker not found in Windows PATH or WSL" -ForegroundColor Red
        $results += [PSCustomObject]@{ Component = "Docker Engine"; Status = "MISSING"; Details = "Install Docker in WSL/Desktop" }
    }
} else {
    Write-Host "  - Docker not found in PATH" -ForegroundColor Red
    $results += [PSCustomObject]@{ Component = "Docker Engine"; Status = "MISSING"; Details = "Install Docker Desktop" }
}

# 2. Docker Compose
Write-Host "`n[2/6] Checking Docker Compose..." -ForegroundColor Yellow
if ($useWsl) {
    $composeCheck = wsl docker compose version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  + Docker Compose V2 is available in WSL" -ForegroundColor Green
        $results += [PSCustomObject]@{ Component = "Docker Compose"; Status = "OK (WSL)"; Details = "WSL2 Compose V2" }
    } else {
        Write-Host "  - Docker Compose not found in WSL" -ForegroundColor Red
        $results += [PSCustomObject]@{ Component = "Docker Compose"; Status = "MISSING"; Details = "docker compose plugin in WSL" }
    }
} else {
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "  + Docker Compose is available" -ForegroundColor Green
        $results += [PSCustomObject]@{ Component = "Docker Compose"; Status = "OK"; Details = "Compose V2 ready" }
    } else {
        Write-Host "  - Docker Compose not found" -ForegroundColor Red
        $results += [PSCustomObject]@{ Component = "Docker Compose"; Status = "MISSING"; Details = "Install Docker Compose" }
    }
}

# 3. Java JDK
Write-Host "`n[3/6] Checking Java..." -ForegroundColor Yellow
if (Get-Command java -ErrorAction SilentlyContinue) {
    Write-Host "  + Java found in host PATH" -ForegroundColor Green
    $results += [PSCustomObject]@{ Component = "Java JDK"; Status = "OK"; Details = "Java available" }
} else {
    Write-Host "  * Java not in host PATH (IntelliJ can manage JDK 17 or run in Docker)" -ForegroundColor Cyan
    $results += [PSCustomObject]@{ Component = "Java JDK"; Status = "OPTIONAL"; Details = "IntelliJ JDK 17 / Docker" }
}

# 4. Python
Write-Host "`n[4/6] Checking Python..." -ForegroundColor Yellow
if ((Get-Command python -ErrorAction SilentlyContinue) -or (Get-Command python3 -ErrorAction SilentlyContinue)) {
    Write-Host "  + Python found" -ForegroundColor Green
    $results += [PSCustomObject]@{ Component = "Python"; Status = "OK"; Details = "Python available" }
} else {
    Write-Host "  * Python not in host PATH (Can run via Docker)" -ForegroundColor Cyan
    $results += [PSCustomObject]@{ Component = "Python"; Status = "OPTIONAL"; Details = "python.org / Docker" }
}

# 5. Node.js
Write-Host "`n[5/6] Checking Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "  + Node.js found" -ForegroundColor Green
    $results += [PSCustomObject]@{ Component = "Node.js"; Status = "OK"; Details = "Node.js available" }
} else {
    Write-Host "  * Node.js not in host PATH (Can run via Docker)" -ForegroundColor Cyan
    $results += [PSCustomObject]@{ Component = "Node.js"; Status = "OPTIONAL"; Details = "nodejs.org / Docker" }
}

# 6. Go & CMake
Write-Host "`n[6/6] Checking Go & CMake..." -ForegroundColor Yellow
if (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host "  + Go found" -ForegroundColor Green
    $results += [PSCustomObject]@{ Component = "Go"; Status = "OK"; Details = "Go available" }
} else {
    Write-Host "  * Go not in host PATH (Market Data runs in Docker)" -ForegroundColor Cyan
    $results += [PSCustomObject]@{ Component = "Go"; Status = "OPTIONAL"; Details = "go.dev / Docker" }
}

if (Get-Command cmake -ErrorAction SilentlyContinue) {
    $results += [PSCustomObject]@{ Component = "CMake"; Status = "OK"; Details = "CMake available" }
} else {
    Write-Host "  * CMake not in host PATH (Order Service compiles inside Docker)" -ForegroundColor Cyan
    $results += [PSCustomObject]@{ Component = "CMake"; Status = "CONTAINERIZED"; Details = "Compiles in Docker" }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " Diagnostic Summary                                     " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize

Write-Host "RECOMMENDED EXECUTION PATHS:" -ForegroundColor White
if ($useWsl) {
    Write-Host "  Path A (Running with WSL Docker):" -ForegroundColor Green
    Write-Host "    .\scripts\start-all.ps1  (Auto-detects and forwards to WSL)" -ForegroundColor Gray
    Write-Host "    OR inside WSL terminal: cd /mnt/d/stock-trading-platform && docker compose up -d" -ForegroundColor Gray
} else {
    Write-Host "  Path A (Docker Compose - Zero Host Toolchains):" -ForegroundColor Green
    Write-Host "    .\scripts\start-all.ps1" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  Path B (Local Java/IntelliJ with Maven Wrapper):" -ForegroundColor Green
Write-Host "    cd apps/identity-wallet-service; .\mvnw.cmd spring-boot:run" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
