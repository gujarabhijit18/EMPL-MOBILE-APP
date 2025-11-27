@echo off
echo ========================================
echo   Starting Frontend Development Server
echo ========================================
echo.

echo [1/2] Updating IP address...
node update-ip.js
if errorlevel 1 (
    echo.
    echo ERROR: Failed to update IP address
    echo Please check update-ip.js script
    pause
    exit /b 1
)

echo.
echo [2/2] Starting Expo...
echo.
echo TIP: Expo will run on port 8081 by default
echo      If port is busy, it will use next available port
echo.

npm start

pause
