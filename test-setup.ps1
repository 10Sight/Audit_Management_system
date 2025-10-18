# Test Setup Script - Verify integration without Redis
Write-Host "🧪 Testing Redis & Socket.IO Setup..." -ForegroundColor Green

Write-Host ""
Write-Host "📋 Checking dependencies..." -ForegroundColor Blue

# Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
}

# Check npm packages in server
Write-Host ""
Write-Host "📦 Checking server dependencies..." -ForegroundColor Blue
Set-Location server
$serverPackages = @("ioredis", "socket.io", "express-session", "connect-redis")
$packageJson = Get-Content package.json | ConvertFrom-Json

foreach ($pkg in $serverPackages) {
    if ($packageJson.dependencies.$pkg) {
        Write-Host "✅ ${pkg}: $($packageJson.dependencies.$pkg)" -ForegroundColor Green
    } else {
        Write-Host "❌ ${pkg}: Not found" -ForegroundColor Red
    }
}

# Check frontend packages
Set-Location ../admin
Write-Host ""
Write-Host "📦 Checking frontend dependencies..." -ForegroundColor Blue
$frontendPackages = @("socket.io-client")
$packageJson = Get-Content package.json | ConvertFrom-Json

foreach ($pkg in $frontendPackages) {
    if ($packageJson.dependencies.$pkg) {
        Write-Host "✅ ${pkg}: $($packageJson.dependencies.$pkg)" -ForegroundColor Green
    } else {
        Write-Host "❌ ${pkg}: Not found" -ForegroundColor Red
    }
}

Set-Location ..

Write-Host ""
Write-Host "📁 Checking created files..." -ForegroundColor Blue

$files = @(
    "server/config/redis.config.js",
    "server/middlewares/cache.middleware.js", 
    "admin/src/context/SocketContext.jsx",
    "admin/src/components/RealtimeNotifications.jsx",
    "admin/.env"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ ${file}: Missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔧 Configuration Status:" -ForegroundColor Blue

# Check server env
if (Test-Path "server/.env") {
    $env = Get-Content "server/.env" -Raw
    if ($env.Contains("REDIS_URL")) {
        Write-Host "✅ Server environment configured" -ForegroundColor Green
    } else {
        Write-Host "❌ Server environment missing Redis config" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Server .env file missing" -ForegroundColor Red
}

# Check admin env
if (Test-Path "admin/.env") {
    Write-Host "✅ Frontend environment configured" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend .env file missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Magenta
Write-Host "1. Install Redis: ./install-redis.ps1 (or manually)" -ForegroundColor White
Write-Host "2. Start Redis: redis-server" -ForegroundColor White
Write-Host "3. Start backend: cd server; npm start" -ForegroundColor White
Write-Host "4. Start frontend: cd admin; npm run dev" -ForegroundColor White
Write-Host "5. Test real-time features!" -ForegroundColor White

Write-Host ""
Write-Host "Without Redis, the app will work but:" -ForegroundColor Yellow
Write-Host "   - No caching (slower responses)" -ForegroundColor White
Write-Host "   - Memory-based sessions (not persistent)" -ForegroundColor White
Write-Host "   - Socket.IO will still work for real-time features" -ForegroundColor White
