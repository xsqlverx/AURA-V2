Write-Host "Setting up ADB port forwarding..." -ForegroundColor Cyan
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
Write-Host "Ports forwarded. Starting Metro..." -ForegroundColor Green
npx expo start --port 8081
