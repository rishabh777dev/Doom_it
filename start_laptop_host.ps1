Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      VAKYABHED 2026 - LAPTOP HOSTING LAUNCHER          " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "
[1/3] Starting FastAPI Backend on Port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PSScriptRoot'; .\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

Write-Host "[2/3] Starting React Frontend on Port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$PSScriptRoot\frontend'; npm run dev"

Start-Sleep -Seconds 4

Write-Host "
[3/3] Starting Cloudflare Tunnel to expose the platform globally..." -ForegroundColor Green
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host "COPY THE HTTPS LINK DISPLAYED BELOW AND SHARE WITH TEAMS:" -ForegroundColor Magenta
Write-Host "--------------------------------------------------------
" -ForegroundColor Cyan

cloudflared tunnel --url http://localhost:5173
