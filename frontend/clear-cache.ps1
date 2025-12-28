# Clear Expo cache script
Write-Host "Clearing Expo cache..." -ForegroundColor Yellow

# Stop any running Expo processes
Get-Process | Where-Object {$_.ProcessName -like "*expo*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove cache directories
if (Test-Path ".expo") {
    Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue
    Write-Host "✓ Cleared .expo cache" -ForegroundColor Green
}

if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "✓ Cleared node_modules cache" -ForegroundColor Green
}

Write-Host "`nCache cleared! Now run: npx expo start --clear --web" -ForegroundColor Cyan

