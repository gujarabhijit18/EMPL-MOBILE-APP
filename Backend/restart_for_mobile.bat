@echo off
echo 🔧 Restarting Backend for Mobile Access
echo ========================================

echo Stopping current backend processes...
taskkill /f /im python.exe 2>nul
taskkill /f /im uvicorn.exe 2>nul

echo.
echo Starting backend with mobile access (--host 0.0.0.0)...
echo This will allow both localhost and mobile IP access
echo.
cd /d "%~dp0"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
