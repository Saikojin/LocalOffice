# LocalOffice Karate E2E Automation Runner
param(
  [string]$Feature = "LocalOfficeTest",
  [switch]$Headless = $true
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  LocalOffice Karate E2E Test Suite" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check if Vite Dev Server is alive on port 3000
$Port = 3000
$DevServerProcess = $null
$NeedsServerLaunch = $false

try {
  $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
  if (-not $tcp.TcpTestSucceeded) {
    $NeedsServerLaunch = $true
  }
} catch {
  $NeedsServerLaunch = $true
}

if ($NeedsServerLaunch) {
  Write-Host "[INFO] Starting local Vite dev server on port $Port..." -ForegroundColor Yellow
  $DevServerProcess = Start-Process -FilePath "npm" -ArgumentList "run dev -- --host 127.0.0.1 --port $Port" -PassThru -NoNewWindow
  
  # Wait for server ready
  $maxRetries = 30
  $ready = $false
  for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $testConn = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
      if ($testConn.TcpTestSucceeded) {
        $ready = $true
        break
      }
    } catch {}
  }

  if (-not $ready) {
    Write-Host "[ERROR] Timed out waiting for Vite dev server on port $Port!" -ForegroundColor Red
    if ($DevServerProcess) { Stop-Process -Id $DevServerProcess.Id -Force -ErrorAction SilentlyContinue }
    exit 1
  }
  Write-Host "[INFO] Vite dev server is running and ready." -ForegroundColor Green
} else {
  Write-Host "[INFO] Vite dev server is already running on port $Port." -ForegroundColor Green
}

# 2. Run Karate Maven Test
$PomPath = Join-Path $PSScriptRoot "pom.xml"
$KarateHeadlessProp = if ($Headless) { "-Dheadless=true" } else { "-Dheadless=false" }

Write-Host "[INFO] Executing Karate test (Feature: $Feature)..." -ForegroundColor Cyan
$MvnExitCode = 0
try {
  if ($Feature -and $Feature -ne "all") {
    & mvn test "-f" "$PomPath" "-Dtest=$Feature" "$KarateHeadlessProp"
  } else {
    & mvn test "-f" "$PomPath" "$KarateHeadlessProp"
  }
  $MvnExitCode = $LASTEXITCODE
} catch {
  $MvnExitCode = 1
} finally {
  # 3. Clean up spawned dev server if we launched it
  if ($DevServerProcess) {
    Write-Host "[INFO] Stopping background dev server (PID: $($DevServerProcess.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $DevServerProcess.Id -Force -ErrorAction SilentlyContinue
  }
}

$ReportPath = Join-Path $PSScriptRoot "target\karate-reports\karate-summary.html"
if (Test-Path $ReportPath) {
  Write-Host ""
  Write-Host "==========================================================" -ForegroundColor Green
  Write-Host "  Karate HTML Test Report generated at:" -ForegroundColor Green
  Write-Host "  file:///$($ReportPath.Replace('\', '/'))" -ForegroundColor White
  Write-Host "==========================================================" -ForegroundColor Green
}

exit $MvnExitCode
