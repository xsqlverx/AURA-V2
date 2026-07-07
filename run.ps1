& .\venv\Scripts\Activate.ps1

while ($true) {
    Write-Host "[AURA] Starting..." -ForegroundColor Cyan
    python main.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[AURA] Stopped." -ForegroundColor Yellow
        break
    }
    Write-Host "[AURA] Crashed. Restarting in 3s..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}
