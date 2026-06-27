@echo off
setlocal

cd /d "%~dp0"

echo.
echo Romanian Whist
echo ===============
echo.
echo This starts the web app and Socket.IO server together.
echo Keep this window open while you play.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Local computer:
echo   http://localhost:3000
echo.
echo Phones on the same Wi-Fi should use one of these IPv4 addresses:
for /f %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object IPAddress -NotLike '127.*' | Where-Object PrefixOrigin -NE 'WellKnown' | Select-Object -ExpandProperty IPAddress"') do echo   http://%%a:3000
echo.
echo If Windows Firewall asks, allow Node.js on Private networks.
echo.

call npm run dev

pause
