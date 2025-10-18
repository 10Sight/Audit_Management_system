# Redis Installation Script for Windows
Write-Host "🔧 Installing Redis for Windows..." -ForegroundColor Green

# Check if Chocolatey is installed
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Chocolatey not found. Please install Chocolatey first:" -ForegroundColor Red
    Write-Host "Run: Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" -ForegroundColor Yellow
    exit 1
}

# Install Redis
Write-Host "📦 Installing Redis..." -ForegroundColor Blue
choco install redis-64 -y

# Start Redis service
Write-Host "🚀 Starting Redis service..." -ForegroundColor Blue
Start-Service Redis

# Test Redis connection
Write-Host "🧪 Testing Redis connection..." -ForegroundColor Blue
try {
    redis-cli ping
    Write-Host "✅ Redis installed and running successfully!" -ForegroundColor Green
    Write-Host "🔗 Redis is running on: localhost:6379" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️ Redis might not be running. Try starting it manually:" -ForegroundColor Yellow
    Write-Host "redis-server" -ForegroundColor White
}

Write-Host "" 
Write-Host "📋 Next steps:" -ForegroundColor Magenta
Write-Host "1. Start your server: cd server && npm start" -ForegroundColor White
Write-Host "2. Start your frontend: cd admin && npm run dev" -ForegroundColor White
Write-Host "3. Check real-time notifications in the admin panel!" -ForegroundColor White
