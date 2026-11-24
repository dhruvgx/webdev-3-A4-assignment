@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download it from https://nodejs.org , install it, then double-click start.bat again.
  pause
  exit /b
)
if not exist node_modules (
  echo Installing, please wait...
  call npm install
)
start "" cmd /c "timeout /t 3 >nul & start http://localhost:8080"
echo Server starting... keep this window open. Close it to stop the chat.
node server-rooms.js
pause
