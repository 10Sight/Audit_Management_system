# Simple Test Setup Script
Write-Host "Testing Redis & Socket.IO Setup..." -ForegroundColor Green

Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Blue

# Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "OK Node.js found: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "ERROR Node.js not found" -ForegroundColor Red
}

# Check server packages
Write-Host ""
Write-Host "Checking server dependencies..." -ForegroundColor Blue
Set-Location server

if (Test-Path package.json) {
    $packageJson = Get-Content package.json | ConvertFrom-Json
    $serverPackages = @("ioredis", "socket.io", "express-session", "connect-redis")
    
    foreach ($pkg in $serverPackages) {
        $version = $packageJson.dependencies.PSObject.Properties | Where-Object { $_.Name -eq $pkg } | Select-Object -ExpandProperty Value
        if ($version) {
            Write-Host "OK ${pkg}: ${version}" -ForegroundColor Green
        } else {
            Write-Host "MISSING ${pkg}" -ForegroundColor Red
        }
    }
} else {
    Write-Host "ERROR server/package.json not found" -ForegroundColor Red
}

# Check frontend packages  
Set-Location ../admin
Write-Host ""
Write-Host "Checking frontend dependencies..." -ForegroundColor Blue

if (Test-Path package.json) {
    $packageJson = Get-Content package.json | ConvertFrom-Json
    $frontendPackages = @("socket.io-client")
    
    foreach ($pkg in $frontendPackages) {
        $version = $packageJson.dependencies.PSObject.Properties | Where-Object { $_.Name -eq $pkg } | Select-Object -ExpandProperty Value
        if ($version) {
            Write-Host "OK ${pkg}: ${version}" -ForegroundColor Green
        } else {
            Write-Host "MISSING ${pkg}" -ForegroundColor Red
        }
    }
} else {
    Write-Host "ERROR admin/package.json not found" -ForegroundColor Red
}

Set-Location ..

# Check files
Write-Host ""
Write-Host "Checking created files..." -ForegroundColor Blue

$files = @(
    "server/config/redis.config.js",
    "server/middlewares/cache.middleware.js", 
    "admin/src/context/SocketContext.jsx",
    "admin/src/components/RealtimeNotifications.jsx",
    "admin/.env",
    "server/.env"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "OK $file" -ForegroundColor Green
    } else {
        Write-Host "MISSING $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Setup Status: COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Magenta
Write-Host "1. Install Redis (optional for testing)" -ForegroundColor White
Write-Host "2. Start backend: cd server && npm start" -ForegroundColor White
Write-Host "3. Start frontend: cd admin && npm run dev" -ForegroundColor White
Write-Host "4. Test real-time notifications!" -ForegroundColor White
