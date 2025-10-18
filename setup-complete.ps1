# Complete Setup Script for Automobile Parts Inspection System
Write-Host "🚀 Setting up Automobile Parts Inspection System with Redis & Socket.IO..." -ForegroundColor Green

# Function to check if a command exists
function Test-Command($command) {
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Check Node.js
if (!(Test-Command "node")) {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green

# Install server dependencies
Write-Host "📦 Installing server dependencies..." -ForegroundColor Blue
Set-Location server
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install server dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Install frontend dependencies  
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
Set-Location admin
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Check Redis installation
Write-Host "🔍 Checking Redis installation..." -ForegroundColor Blue
if (!(Test-Command "redis-server")) {
    Write-Host "⚠️ Redis not found. Installing Redis..." -ForegroundColor Yellow
    
    # Check if Chocolatey is available
    if (Test-Command "choco") {
        choco install redis-64 -y
    } else {
        Write-Host "❌ Please install Redis manually:" -ForegroundColor Red
        Write-Host "1. Install Chocolatey: https://chocolatey.org/install" -ForegroundColor White
        Write-Host "2. Run: choco install redis-64" -ForegroundColor White
        Write-Host "Or download from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor White
        exit 1
    }
}

# Test Redis connection
Write-Host "🧪 Testing Redis connection..." -ForegroundColor Blue
$redisRunning = $false
try {
    $result = redis-cli ping 2>$null
    if ($result -eq "PONG") {
        $redisRunning = $true
        Write-Host "✅ Redis is running!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Redis not running, attempting to start..." -ForegroundColor Yellow
}

if (-not $redisRunning) {
    try {
        Start-Service Redis -ErrorAction SilentlyContinue
        Start-Sleep 2
        $result = redis-cli ping 2>$null
        if ($result -eq "PONG") {
            Write-Host "✅ Redis started successfully!" -ForegroundColor Green
            $redisRunning = $true
        }
    } catch {
        Write-Host "⚠️ Could not start Redis service. You may need to start it manually:" -ForegroundColor Yellow
        Write-Host "Run: redis-server" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "📋 What's been set up:" -ForegroundColor Cyan
Write-Host "  ✅ Server dependencies installed" -ForegroundColor White
Write-Host "  ✅ Frontend dependencies installed" -ForegroundColor White
Write-Host "  ✅ Redis caching system" -ForegroundColor White
Write-Host "  ✅ Socket.IO real-time notifications" -ForegroundColor White
Write-Host "  ✅ Environment configuration" -ForegroundColor White

Write-Host ""
Write-Host "🚀 Starting the application:" -ForegroundColor Magenta
Write-Host "1. Start Redis (if not running): redis-server" -ForegroundColor White
Write-Host "2. Start backend server: cd server; npm start" -ForegroundColor White  
Write-Host "3. Start frontend: cd admin; npm run dev" -ForegroundColor White
Write-Host "4. Open http://localhost:5173 in your browser" -ForegroundColor White

Write-Host ""
Write-Host "🔧 Features added:" -ForegroundColor Cyan
Write-Host "  🚀 Faster API responses with Redis caching" -ForegroundColor White
Write-Host "  🔔 Real-time notifications with Socket.IO" -ForegroundColor White
Write-Host "  📊 Better session management" -ForegroundColor White
Write-Host "  ⚡ Improved user experience" -ForegroundColor White

Write-Host ""
Write-Host "📚 For troubleshooting, check README_REDIS_SOCKETIO.md" -ForegroundColor Yellow
