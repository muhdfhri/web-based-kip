# MEWAH-KIP - One-Click Start
# Usage:
#   .\start.ps1              -> Start all (first time = setup + start)
#   .\start.ps1 -Quick       -> Skip npm install & DB import
#   .\start.ps1 -DockerOnly  -> Just start MySQL + Redis
#   .\start.ps1 -Stop        -> Stop everything

param(
  [switch]$Quick,
  [switch]$DockerOnly,
  [switch]$Stop
)

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $base

function Write-Step($t)   { Write-Host "`n--- $t ---" -ForegroundColor Cyan }
function Write-OK($m)     { Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn($m)   { Write-Host "  [!!] $m" -ForegroundColor Yellow }
function Write-Info($m)   { Write-Host "  [..] $m" -ForegroundColor Gray }

# Check prerequisites
Write-Step "Checking Prerequisites"

$hasDocker = (Get-Command docker -ErrorAction SilentlyContinue) -ne $null
$hasNode   = (Get-Command node   -ErrorAction SilentlyContinue) -ne $null
$hasPm2    = (Get-Command pm2    -ErrorAction SilentlyContinue) -ne $null

if ($hasDocker) { Write-OK "Docker found" }
else            { Write-Warn "Docker not found - install from https://docker.com" }

if ($hasNode)   { Write-OK "Node.js found" }
else            { Write-Warn "Node.js not found - install from https://nodejs.org" }

if (-not $hasDocker -and -not $hasNode) {
  Write-Host "[FAIL] Install Docker or Node.js first." -ForegroundColor Red
  exit 1
}

# Stop mode
if ($Stop) {
  Write-Step "Stopping All Services"
  if ($hasPm2) {
    pm2 stop all 2>$null
    pm2 delete all 2>$null
    Write-OK "PM2 stopped"
  }
  if ($hasDocker) {
    docker compose down 2>$null
    Write-OK "Docker stopped"
  }
  Write-Host "[DONE] All stopped."
  exit 0
}

# Step 1: Start infrastructure
Write-Step "Starting Infrastructure (MySQL + Redis)"

if ($hasDocker) {
  $mysqlUp = docker ps --filter "name=kip-mysql" --filter "status=running" --format "table" 2>$null
  $redisUp = docker ps --filter "name=kip-redis" --filter "status=running" --format "table" 2>$null

  if (($mysqlUp -eq $null) -or ($redisUp -eq $null)) {
    Write-Info "Starting MySQL + Redis..."
    docker compose up -d mysql redis
    if ($LASTEXITCODE -eq 0) {
      Write-OK "MySQL + Redis started"
    } else {
      Write-Warn "Docker compose failed. Is Docker Desktop running?"
    }
  } else {
    Write-OK "MySQL + Redis already running"
  }

  Write-Info "Waiting for MySQL..."
  $maxRetries = 30
  $retry = 0
  $ready = $false
  while ($retry -lt $maxRetries) {
    $result = docker exec kip-mysql mysqladmin ping -h localhost -u root -proot_change_me 2>$null
    if ($result -match "alive") {
      $ready = $true
      break
    }
    $retry++
    Start-Sleep -Seconds 2
  }
  if ($ready) {
    Write-OK "MySQL is ready"
  } else {
    Write-Warn "MySQL not ready after $maxRetries seconds"
  }
} else {
  Write-Warn "Docker not found. Make sure MySQL (:3306) and Redis (:6379) are running."
}

if ($DockerOnly) {
  Write-Host "[DONE] Infrastructure: MySQL :3306 | Redis :6379"
  exit 0
}

# Step 2: First-time setup
if (-not $Quick) {
  Write-Step "First-Time Setup"

  if (-not $hasPm2) {
    Write-Info "Installing PM2..."
    npm install -g pm2
    if ($LASTEXITCODE -eq 0) {
      Write-OK "PM2 installed"
    }
  }

  Write-Step "Installing Dependencies"

  $serviceDirs = @(
    "main-service\backend",
    "main-service\frontend",
    "services\realtime-service",
    "services\logsheet-service",
    "services\grading-service",
    "services\reporting-service",
    "alarm\backend",
    "contacts\backend",
    "maintenance\backend"
  )

  $stationDirs = Get-ChildItem -Path "stations" -Directory | ForEach-Object { "stations\$_`\backend" }
  $serviceDirs += $stationDirs

  foreach ($dir in $serviceDirs) {
    $fullPath = Join-Path $base $dir
    $pkgPath = Join-Path $fullPath "package.json"
    if (Test-Path $pkgPath) {
      Write-Info "  -> $dir" -NoNewline
      Push-Location $fullPath
      if ($dir -eq "main-service\frontend") {
        npm install --silent --legacy-peer-deps 2>$null
      } else {
        npm install --silent 2>$null
      }
      if ($LASTEXITCODE -eq 0) {
        Write-Host " [OK]" -ForegroundColor Green
      } else {
        Write-Host " [FAIL]" -ForegroundColor Red
      }
      Pop-Location
    }
  }

  Write-OK "Dependencies installed"

  # Import databases via import-all.ps1
  $importScript = Join-Path $base "import-all.ps1"
  if (Test-Path $importScript) {
    Write-Step "Importing Databases"
    & $importScript
  }

  # Create logs folder
  $logsPath = Join-Path $base "logs"
  if (-not (Test-Path $logsPath)) {
    New-Item -ItemType Directory -Path $logsPath | Out-Null
  }

  Write-OK "First-time setup complete"
}

# Step 3: Start PM2
Write-Step "Starting All Services via PM2"

$pm2List = pm2 list 2>$null

if ($pm2List -match "online") {
  Write-Info "PM2 already running - restarting..."
  pm2 restart ecosystem.config.cjs
} else {
  pm2 start ecosystem.config.cjs
}

if ($LASTEXITCODE -eq 0) {
  Write-OK "All services started"
} else {
  Write-Warn "PM2 start failed - check ecosystem.config.cjs"
}

# Done
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    MEWAH-KIP - ALL SERVICES RUNNING    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Monitor : pm2 monit" -ForegroundColor Yellow
Write-Host "  Status  : pm2 list" -ForegroundColor Yellow
Write-Host "  Logs    : pm2 logs" -ForegroundColor Yellow
Write-Host "  Stop    : .\start.ps1 -Stop" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Gateway : http://localhost:80" -ForegroundColor Green
Write-Host "  Health  : http://localhost:80/health" -ForegroundColor Green
Write-Host ""
