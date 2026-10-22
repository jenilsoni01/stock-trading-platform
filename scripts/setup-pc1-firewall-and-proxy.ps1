# ==============================================================================
# PC 1: Windows Firewall & WSL2 Port Forwarding Setup Script
# ==============================================================================
# Must be run in PowerShell AS ADMINISTRATOR.
# This opens the firewall and forwards LAN connections from other PCs (e.g. PC 3)
# to the microservices running inside WSL2 Docker (Wallet 8081, Kafka 9093, etc.)
# ==============================================================================

# 1. Require Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "CRITICAL: This script must be run AS ADMINISTRATOR! Please right-click PowerShell and select 'Run as Administrator'."
    exit 1
}

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " [PC 1] Configuring Firewall & WSL2 Port Proxy for STP Multi-PC LAN" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan

# 2. Retrieve WSL2 IP
$wslIp = (wsl hostname -I).Trim().Split(" ")[0]
if (-not $wslIp) {
    Write-Error "Could not detect WSL IP address. Is WSL running?"
    exit 1
}
Write-Host "[+] Detected WSL2 IP Address: $wslIp" -ForegroundColor Green

$ports = @(3000, 5432, 8080, 8081, 8761, 9092, 9093)

# 3. Add or Update Windows Firewall Inbound Rule
Write-Host "[+] Configuring Windows Firewall rule 'STP Platform Dev Ports'..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "STP Platform Dev Ports" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "STP Platform Dev Ports" `
                    -Direction Inbound `
                    -LocalPort $ports `
                    -Protocol TCP `
                    -Action Allow | Out-Null
Write-Host "[OK] Firewall rule created successfully for ports: $($ports -join ', ')" -ForegroundColor Green

# 4. Configure netsh portproxy so remote PCs can reach WSL2 microservices
Write-Host "[+] Configuring portproxy mappings to WSL2 ($wslIp)..." -ForegroundColor Yellow
foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 | Out-Null
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp | Out-Null
    Write-Host "    -> Port $port forwarded: 0.0.0.0:$port -> $wslIp`:$port" -ForegroundColor Gray
}

Write-Host "`n[+] Current Active Portproxy Configuration:" -ForegroundColor Cyan
netsh interface portproxy show all

Write-Host "`n====================================================================" -ForegroundColor Green
Write-Host " SUCCESS: PC 1 is now ready to accept incoming connections from PC 2-5!" -ForegroundColor Green
Write-Host " Wallet Service (8081) and Kafka (9093) are now accessible over LAN." -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
