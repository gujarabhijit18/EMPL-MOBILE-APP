@echo off
echo 🔧 Restarting Backend with Mobile Access
echo =====================================

echo Stopping any existing backend processes...
taskkill /f /im python.exe 2>nul

echo.
echo Starting backend with mobile access...
echo This command makes the backend accessible from your mobile device
echo.
cd /d "%~dp0"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
