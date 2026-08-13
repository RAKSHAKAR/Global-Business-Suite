<#
.SYNOPSIS
  Enterprise SaaS Platform - Local Development Orchestrator
  ============================================================
  Admin Portal   -> http://localhost:3000  (admin@enterprise.com / Admin@1234!)
  Partner Portal -> http://localhost:3001  (partner@demo.com   / Partner@1234!)
  API Backend    -> http://localhost:4000
  API Docs       -> http://localhost:4000/api-docs
#>
[CmdletBinding()]
param (
    [string]$Action = '',
    [switch]$DeepClean,
    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$Root = $PSScriptRoot

# Fix console encoding
[console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  +===============================================================+" -ForegroundColor Cyan
    Write-Host "  |      ENTERPRISE SAAS PLATFORM - Local Dev Orchestrator        |" -ForegroundColor White
    Write-Host "  +===============================================================+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Admin Portal    -> http://localhost:3000" -ForegroundColor DarkYellow
    Write-Host "  Partner Portal  -> http://localhost:3001" -ForegroundColor DarkYellow
    Write-Host "  Customer Portal -> http://localhost:3002" -ForegroundColor DarkYellow
    Write-Host "  Web Portal      -> http://localhost:3003" -ForegroundColor DarkYellow
    Write-Host "  Admin Mobile    -> http://localhost:8081" -ForegroundColor DarkYellow
    Write-Host "  Partner Mobile  -> http://localhost:8082" -ForegroundColor DarkYellow
    Write-Host "  Customer Mobile -> http://localhost:8083" -ForegroundColor DarkYellow
    Write-Host "  API Backend     -> http://localhost:4000" -ForegroundColor DarkYellow
    Write-Host "  API Swagger     -> http://localhost:4000/api-docs" -ForegroundColor DarkYellow
    Write-Host "  DB Portal       -> http://localhost:5555" -ForegroundColor DarkYellow
    Write-Host ""
    Write-Host "  CREDENTIALS:" -ForegroundColor White
    Write-Host "    Admin:    admin@enterprise.com / Admin@1234!" -ForegroundColor Green
    Write-Host "    Partner:  partner@demo.com     / Partner@1234!" -ForegroundColor Green
    Write-Host "    Customer: customer@demo.com    / Customer@1234!" -ForegroundColor Green
    Write-Host ""
}

function Clear-Port([int]$p) {
    try {
        Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object {
                try {
                    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                } catch {
                    Write-Host "  [Port Cleanup Warning] Could not stop process on port $p" -ForegroundColor DarkGray
                }
            }
    } catch {
        # Ignore TCP connection lookup errors
    }
}

function Stop-AllServices {
    Write-Host "  Stopping all services and clearing ports..." -ForegroundColor Yellow
    @(3000, 3001, 3002, 3003, 4000, 5555, 8081, 8082, 8083) | ForEach-Object { Clear-Port $_ }
    Start-Sleep -Seconds 1
    Write-Host "  All ports cleared." -ForegroundColor Green
}

function Invoke-DeepClean {
    Write-Host "  Deep cleaning workspace..." -ForegroundColor Yellow
    if (Test-Path "$Root\node_modules") { Remove-Item "$Root\node_modules" -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path "$Root\.turbo") { Remove-Item "$Root\.turbo" -Recurse -Force -ErrorAction SilentlyContinue }
    $nextDirs = Get-ChildItem -Path "$Root\apps" -Recurse -Filter ".next" -Directory -ErrorAction SilentlyContinue
    if ($nextDirs) { $nextDirs | ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } }
    Write-Host "  Deep clean complete." -ForegroundColor Green
}

function Test-PreflightEnvironment {
    Write-Host "  [Pre-flight] Checking environment dependencies..." -ForegroundColor Cyan
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "  [ERROR] Node.js is not installed or not in PATH!" -ForegroundColor Red
        return $false
    }
    $nodeVersion = node --version
    Write-Host "  [Pre-flight] Found Node.js: $nodeVersion" -ForegroundColor DarkGray

    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Host "  [Pre-flight] pnpm not found. Installing globally..." -ForegroundColor Yellow
        try {
            npm install -g pnpm
        } catch {
            Write-Host "  [ERROR] Failed to install pnpm globally: $_" -ForegroundColor Red
            return $false
        }
    }
    $pnpmVersion = pnpm --version
    Write-Host "  [Pre-flight] Found pnpm: v$pnpmVersion" -ForegroundColor DarkGray

    return $true
}

function Invoke-StepWithRetry {
    param(
        [string]$StepName,
        [scriptblock]$Command,
        [int]$MaxAttempts = 3
    )
    Write-Host "  $StepName..." -ForegroundColor Cyan
    $attempt = 1
    $success = $false
    while ($attempt -le $MaxAttempts -and -not $success) {
        try {
            & $Command
            $code = 0
            if (Test-Path Variable:\LASTEXITCODE) { $code = $LASTEXITCODE }
            if ($code -eq 0) {
                $success = $true
            } else {
                Write-Host "  [Attempt $attempt/$MaxAttempts] $StepName returned code $code" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  [Attempt $attempt/$MaxAttempts] $StepName error: $_" -ForegroundColor Yellow
        }
        if (-not $success) {
            if ($attempt -lt $MaxAttempts) { Start-Sleep -Seconds 2 }
            $attempt++
        }
    }
    if ($success) {
        Write-Host "  [OK] $StepName completed successfully." -ForegroundColor Green
    } else {
        Write-Host "  [WARN] $StepName failed after $MaxAttempts attempts. Continuing..." -ForegroundColor Yellow
    }
}

function Show-InteractiveMenu {
    Show-Banner
    Write-Host "  What would you like to do?" -ForegroundColor White
    Write-Host ""
    Write-Host "  -- START ------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [1]  Start all services (API + Admin Portal + Partner Portal + Web)" -ForegroundColor Cyan
    Write-Host "  [2]  Start + Re-install dependencies (full fresh start)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  -- STOP -------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [3]  Stop services              (kill ports, keep node_modules)" -ForegroundColor Cyan
    Write-Host "  [4]  Stop + Deep Clean          (kill ports + delete node_modules, .turbo, .next)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  -- EXIT -------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [0]  Exit orchestrator" -ForegroundColor DarkGray
    Write-Host ""

    $choice = ""
    while ($choice -notmatch "^[0-4]$") { $choice = Read-Host "  Enter choice [0-4]" }

    switch ($choice) {
        "1" { $script:Action = "start"; $script:SkipInstall = $true }
        "2" { $script:Action = "start"; $script:SkipInstall = $false }
        "3" { $script:Action = "stop" }
        "4" { $script:Action = "stop"; $script:DeepClean = $true }
        "0" { exit 0 }
    }
}

$InteractiveMode = (-not $Action -or $Action -eq "")
$running = $true

while ($running) {
    if ($InteractiveMode -and (-not $Action -or $Action -eq "")) {
        Show-InteractiveMenu
    }

    if ($Action -eq "stop") {
        Stop-AllServices
        if ($DeepClean) { Invoke-DeepClean }
        $Action = ""
    }

    if ($Action -eq "start") {
        Show-Banner
        
        if (-not (Test-PreflightEnvironment)) {
            Write-Host "  [CRITICAL] Pre-flight checks failed. Halting setup." -ForegroundColor Red
            $Action = ""
            continue
        }

        Stop-AllServices

        if (-not $SkipInstall) {
            Set-Location $Root
            Invoke-StepWithRetry -StepName "Installing dependencies with pnpm" -Command {
                pnpm install --config.confirmModulesPurge=false
            }
        }

        Write-Host ""
        Push-Location "$Root\packages\database"

        Invoke-StepWithRetry -StepName "Generating Prisma Client" -Command {
            npx prisma generate
        }

        Invoke-StepWithRetry -StepName "Pushing Database Schema (SQLite)" -Command {
            npx prisma db push --accept-data-loss
        }

        if (Test-Path "$Root\packages\database\prisma\seed.ts") {
            Invoke-StepWithRetry -StepName "Seeding Database with default users & data" -Command {
                npx tsx prisma\seed.ts
            }
        } else {
            Write-Host "  WARNING: No seed file found. Skipping seed." -ForegroundColor Yellow
        }

        Pop-Location

        Write-Host ""
        Write-Host "  Starting services in separate windows..." -ForegroundColor Green
        Write-Host ""
        
        Write-Host "  [1/9] API Backend       -> http://localhost:4000" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title API-Backend && cd /d `"$Root`" && pnpm --filter api dev"
        Start-Sleep -Seconds 3

        Write-Host "  [2/9] Admin Portal      -> http://localhost:3000" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title Admin-Portal && cd /d `"$Root`" && pnpm --filter admin-portal dev"
        Start-Sleep -Seconds 1

        Write-Host "  [3/9] Partner Portal    -> http://localhost:3001" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title Partner-Portal && cd /d `"$Root`" && pnpm --filter partner-portal dev"
        Start-Sleep -Seconds 1

        Write-Host "  [4/9] Customer Portal   -> http://localhost:3002" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title Customer-Portal && cd /d `"$Root`" && pnpm --filter customer-portal dev"
        Start-Sleep -Seconds 1

        Write-Host "  [5/9] Web Portal        -> http://localhost:3003" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title Web-Portal && cd /d `"$Root`" && pnpm --filter web-portal dev"
        Start-Sleep -Seconds 1

        Write-Host "  [6/9] Admin Mobile      -> http://localhost:8081" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title Admin-Mobile && cd /d `"$Root`" && pnpm --filter admin-mobile web --port 8081 --clear"
        Start-Sleep -Seconds 1

        Write-Host "  [7/9] Partner Mobile    -> http://localhost:8082" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title Partner-Mobile && cd /d `"$Root`" && pnpm --filter partner-mobile web --port 8082 --clear"
        Start-Sleep -Seconds 1

        Write-Host "  [8/9] Customer Mobile   -> http://localhost:8083" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title Customer-Mobile && cd /d `"$Root`" && pnpm --filter customer-mobile web --port 8083 --clear"
        Start-Sleep -Seconds 1

        Write-Host "  [9/9] Database Portal   -> http://localhost:5555" -ForegroundColor White
        Start-Process cmd -ArgumentList "/k title Database-Portal && cd /d `"$Root\packages\database`" && npx prisma studio --port 5555"
        Start-Sleep -Seconds 3

        Write-Host ""
        Write-Host "  ================================================================" -ForegroundColor Cyan
        Write-Host "  All services launching! Opening main web portal tabs..." -ForegroundColor Green
        
        Start-Process "http://localhost:3000"
        Start-Process "http://localhost:3001"
        Start-Process "http://localhost:3002"
        Start-Process "http://localhost:3003"
        Start-Process "http://localhost:4000/api-docs"

        Write-Host ""
        Write-Host "  Wait ~10-15 seconds for services to start, then open:" -ForegroundColor White
        Write-Host "    Admin Portal:    http://localhost:3000" -ForegroundColor DarkYellow
        Write-Host "    Partner Portal:  http://localhost:3001" -ForegroundColor DarkYellow
        Write-Host "    Customer Portal: http://localhost:3002" -ForegroundColor DarkYellow
        Write-Host "    Web Portal:      http://localhost:3003" -ForegroundColor DarkYellow
        Write-Host "    Admin Mobile:    http://localhost:8081" -ForegroundColor DarkYellow
        Write-Host "    Partner Mobile:  http://localhost:8082" -ForegroundColor DarkYellow
        Write-Host "    Customer Mobile: http://localhost:8083" -ForegroundColor DarkYellow
        Write-Host "    API Docs:        http://localhost:4000/api-docs" -ForegroundColor DarkYellow
        Write-Host "    DB Portal:       http://localhost:5555" -ForegroundColor DarkYellow
        Write-Host ""
        Write-Host "  LOGIN CREDENTIALS:" -ForegroundColor White
        Write-Host "    Admin:    admin@enterprise.com  / Admin@1234!" -ForegroundColor Green
        Write-Host "    Partner:  partner@demo.com      / Partner@1234!" -ForegroundColor Green
        Write-Host "    Customer: customer@demo.com     / Customer@1234!" -ForegroundColor Green
        Write-Host "  ================================================================" -ForegroundColor Cyan
        Write-Host ""
        $Action = ""
    }

    Write-Host "  Press any key to return to Local Dev Menu (or [Q] to Quit)..." -ForegroundColor Yellow
    $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    if ($key.Character -eq 'q' -or $key.Character -eq 'Q' -or $key.VirtualKeyCode -eq 27) {
        $running = $false
        break
    }
}

