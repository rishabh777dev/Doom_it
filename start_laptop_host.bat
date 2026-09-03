@echo off
title Vakya-Bhed 2026 CTF Host
echo ========================================================
echo       VAKYA-BHED 2026 - LAPTOP HOSTING LAUNCHER
echo ========================================================
echo.

echo [1/3] Starting FastAPI Backend on Port 8000...
start "Vakya-Bhed Backend (FastAPI)" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo [2/3] Starting React Frontend on Port 5173...
start "Vakya-Bhed Frontend (React + Vite)" cmd /k "cd /d %~dp0\frontend && npm run dev"

timeout /t 4 >nul

echo.
echo [3/3] Starting Cloudflare Tunnel to expose the platform globally...
echo --------------------------------------------------------
echo COPY THE HTTPS LINK DISPLAYED BELOW AND SHARE WITH TEAMS:
echo --------------------------------------------------------
cloudflared tunnel --url http://localhost:5173

pause
