# Restart Backend with Mobile Access
Write-Host "🔧 Restarting Backend with Mobile Access" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host "Stopping any existing backend processes..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host ""
Write-Host "Starting backend with mobile access..." -ForegroundColor Yellow
Write-Host "This command makes the backend accessible from your mobile device" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
