@echo off
echo.
echo ========================================
echo   Restarting Expo with Clean Cache
echo ========================================
echo.

REM Kill any running Metro bundler
echo Stopping Metro bundler...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo.
echo Starting Expo with clean cache...
echo.

REM Start Expo with clean cache
npx expo start -c

pause
