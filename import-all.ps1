# MEWAH-KIP - Import ALL Databases
# Auto-detect MySQL + import semua database
#
# Jalankan:
#   .\import-all.ps1
#   .\import-all.ps1 -Password "pass"

param([string]$Password = "")

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $base

# ── Cari MySQL di berbagai lokasi ──
$mysqlPaths = @(
  "mysql",                                    # sudah di PATH
  "$env:ProgramFiles\MySQL\bin\mysql.exe",    # MySQL installer
  "${env:ProgramFiles(x86)}\MySQL\bin\mysql.exe",
  "C:\xampp\mysql\bin\mysql.exe",             # XAMPP
  "C:\Program Files\XAMPP\mysql\bin\mysql.exe",
  "D:\xampp\mysql\bin\mysql.exe",
  "$env:LOCALAPPDATA\Programs\MySQL\bin\mysql.exe"
)

$mysqlExe = $null
foreach ($path in $mysqlPaths) {
  $resolved = $null
  if ($path -eq "mysql") {
    # Coba dari PATH
    try { $resolved = (Get-Command "mysql" -ErrorAction Stop).Source } catch {}
  } elseif (Test-Path $path) {
    $resolved = $path
  }

  if ($resolved) {
    # Test koneksi
    try {
      if ($Password -ne "") {
        & $resolved "-u" "root" "-p$Password" "-e" "SELECT 1" 2>$null
      } else {
        & $resolved "-u" "root" "-e" "SELECT 1" 2>$null
      }
      if ($LASTEXITCODE -eq 0) {
        $mysqlExe = $resolved
        break
      }
    } catch {}
  }
}

if (-not $mysqlExe) {
  Write-Host "========================================" -ForegroundColor Red
  Write-Host "   MYSQL TIDAK DITEMUKAN" -ForegroundColor Red
  Write-Host "========================================" -ForegroundColor Red
  Write-Host ""
  Write-Host "  Cari manual: where mysql (di CMD)" -ForegroundColor Yellow
  Write-Host "  Lalu edit script ini, ganti \$mysqlExe dengan path nya" -ForegroundColor Yellow
  Write-Host ""
  pause
  exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   MEWAH-KIP - IMPORT ALL DATABASES    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MySQL: $mysqlExe" -ForegroundColor Gray
Write-Host ""

$mysqlArgs = @("-u", "root", "-f")
if ($Password -ne "") { $mysqlArgs += "-p$Password" }

$success = 0
$failed = 0
$schemaFiles = @()

# Service utama
$schemaFiles += "main-service/database/schema.sql"
$schemaFiles += "services/station-service/database/schema.sql"
$schemaFiles += "services/logsheet-service/database/schema.sql"
$schemaFiles += "services/grading-service/database/schema.sql"
$schemaFiles += "maintenance/database/schema.sql"
$schemaFiles += "alarm/database/schema.sql"
$schemaFiles += "contacts/database/schema.sql"

# Cari schema.sql di semua stations
$stationFiles = Get-ChildItem -Path "$base/stations" -Recurse -Filter "schema.sql" | Where-Object { $_.FullName -match "\\database\\schema.sql$" }
foreach ($f in $stationFiles) {
  $schemaFiles += $f.FullName.Replace("$base\", "")
}

Write-Host "  Menemukan $($schemaFiles.Count) file database`n"

foreach ($file in $schemaFiles) {
  $fullPath = Join-Path $base $file
  if (Test-Path $fullPath) {
    Write-Host "  -> $file" -NoNewline
    $content = Get-Content $fullPath -Raw
    $content | & $mysqlExe $mysqlArgs
    if ($LASTEXITCODE -eq 0) {
      Write-Host " OK" -ForegroundColor Green
      $success++
    } else {
      Write-Host " FAIL" -ForegroundColor Red
      $failed++
    }
  } else {
    Write-Host "  -> $file NOT FOUND" -ForegroundColor Red
    $failed++
  }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Berhasil: $success | Gagal: $failed" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($failed -eq 0) {
  Write-Host ""
  Write-Host "  SEMUA DATABASE BERHASIL!" -ForegroundColor Green
  Write-Host "  Jalankan: pm2 restart all" -ForegroundColor Yellow
  Write-Host "  Lalu buka: http://localhost:5173" -ForegroundColor Yellow
} else {
  Write-Host ""
  Write-Host "  Ada $failed gagal." -ForegroundColor Red
  Write-Host "  Coba dengan password: .\import-all.ps1 -Password 'pass'" -ForegroundColor Yellow
}
Write-Host ""
pause
