@echo off
echo Clearing Metro Bundler Cache...
echo.

REM Clear npm cache
echo [1/4] Clearing npm cache...
call npm cache clean --force

REM Clear watchman (if installed)
echo [2/4] Clearing watchman...
call watchman watch-del-all 2>nul

REM Clear Metro bundler cache
echo [3/4] Clearing Metro bundler cache...
call npx react-native start --reset-cache 2>nul
timeout /t 2 >nul
taskkill /F /IM node.exe 2>nul

REM Clear Expo cache
echo [4/4] Clearing Expo cache...
call npx expo start -c 2>nul
timeout /t 2 >nul
taskkill /F /IM node.exe 2>nul

echo.
echo ✅ Cache cleared successfully!
echo.
echo To start the app with clean cache, run:
echo   npm start -- --reset-cache
echo   or
echo   npx expo start -c
echo.
pause
