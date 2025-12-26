# Test local setup script
Write-Host "`n=== Testing Local Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✓ Backend is running!" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Backend is NOT running" -ForegroundColor Red
    Write-Host "   Start it with: cd backend && npm start" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Checking environment files..." -ForegroundColor Yellow

if (Test-Path "backend\.env") {
    Write-Host "   ✓ backend/.env exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ backend/.env missing" -ForegroundColor Red
    Write-Host "   Create it with MAPBOX_TOKEN, OPENWEATHER_KEY, PORT=3000" -ForegroundColor Yellow
}

if (Test-Path "frontend\.env") {
    Write-Host "   ✓ frontend/.env exists" -ForegroundColor Green
} else {
    Write-Host "   ✗ frontend/.env missing" -ForegroundColor Red
    Write-Host "   Create it with EXPO_PUBLIC_MAPBOX_TOKEN, EXPO_PUBLIC_API_URL=http://localhost:3000/api" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Start backend:  cd backend && npm start" -ForegroundColor White
Write-Host "2. Start frontend: cd frontend && npx expo start --web" -ForegroundColor White
Write-Host "3. Open browser:   http://localhost:8081 (or port shown by Expo)" -ForegroundColor White
Write-Host ""

