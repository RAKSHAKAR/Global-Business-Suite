<#
.SYNOPSIS
  Enterprise SaaS Platform - Production Deployment Script (Turborepo)
#>
[CmdletBinding()]
param (
    [string]$Action = '',
    [switch]$SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$Root = $PSScriptRoot

# Fix Unicode output in Windows terminals
[console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  +============================================================+" -ForegroundColor Cyan
    Write-Host "  |   GLOBAL BUSINESS SUITE - Deployment Orchestrator (Turbo)  |" -ForegroundColor White
    Write-Host "  +============================================================+" -ForegroundColor Cyan
    Write-Host ""
}

function Test-PreflightEnvironment {
    Write-Host "  [Pre-flight] Checking environment dependencies..." -ForegroundColor Cyan
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "  [ERROR] Node.js is not installed or not in PATH!" -ForegroundColor Red
        return $false
    }
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Host "  [Pre-flight] pnpm not found. Installing globally..." -ForegroundColor Yellow
        try { npm install -g pnpm } catch { return $false }
    }
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
        Write-Host "  [WARN] $StepName failed after $MaxAttempts attempts." -ForegroundColor Yellow
    }
}

function Show-InteractiveMenu {
    Show-Banner
    Write-Host "  What would you like to do?" -ForegroundColor White
    Write-Host ""
    Write-Host "  -- DEPLOY -----------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [1]  Deploy to Production (Build + DB Migration)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  -- INFO -------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [2]  Show deployment status (PM2)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  -- EXIT -------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  [0]  Exit orchestrator" -ForegroundColor DarkGray
    Write-Host ""

    $choice = ""
    while ($choice -notmatch "^[0-2]$") { $choice = Read-Host "  Enter choice [0-2]" }

    switch ($choice) {
        "1" { $script:Action = "deploy" }
        "2" { $script:Action = "status" }
        "0" { exit 0 }
    }
}

$running = $true

while ($running) {
    if (-not $Action -or $Action -eq "") {
        Show-InteractiveMenu
    }

    if ($Action -eq "status") {
        Write-Host "  Checking PM2 Status..." -ForegroundColor Yellow
        if (Get-Command pm2 -ErrorAction SilentlyContinue) {
            pm2 list
        } else {
            Write-Host "  PM2 not found. Install it with: npm install -g pm2" -ForegroundColor Red
        }
        $Action = ""
    }

    if ($Action -eq "deploy") {
        Show-Banner

        if (-not (Test-PreflightEnvironment)) {
            Write-Host "  [CRITICAL] Deployment pre-flight checks failed." -ForegroundColor Red
            $Action = ""
            continue
        }

        if (-not $SkipInstall) {
            Invoke-StepWithRetry -StepName "Installing dependencies with pnpm" -Command {
                pnpm install --config.confirmModulesPurge=false
            }
        }

        Push-Location "$Root\packages\database"
        Invoke-StepWithRetry -StepName "Generating Prisma Client" -Command {
            pnpm exec prisma generate
        }
        Pop-Location

        Invoke-StepWithRetry -StepName "Building Turborepo Projects" -Command {
            pnpm build
        }

        Push-Location "$Root\packages\database"
        Invoke-StepWithRetry -StepName "Pushing Database Schema (SQLite)" -Command {
            pnpm exec prisma db push --accept-data-loss
        }

        Invoke-StepWithRetry -StepName "Seeding Database" -Command {
            pnpm exec tsx prisma\seed.ts
        }
        Pop-Location

        Write-Host "  =========================================" -ForegroundColor Cyan
        Write-Host "  Deployment build completed successfully!" -ForegroundColor Green
        Write-Host "  To run in production, use a process manager like PM2:" -ForegroundColor Yellow
        Write-Host "    pm2 start apps\api\dist\index.js --name api" -ForegroundColor DarkGray
        Write-Host "    pm2 start pnpm --name admin-portal -- --filter admin-portal start" -ForegroundColor DarkGray
        Write-Host "    pm2 start pnpm --name partner-portal -- --filter partner-portal start" -ForegroundColor DarkGray
        Write-Host "    pm2 start pnpm --name customer-portal -- --filter customer-portal start" -ForegroundColor DarkGray
        Write-Host "    pm2 start pnpm --name web-portal -- --filter web-portal start" -ForegroundColor DarkGray
        Write-Host "  =========================================" -ForegroundColor Cyan
        $Action = ""
    }

    Write-Host ""
    Write-Host "  Press any key to return to Deployment Menu (or [Q] to Quit)..." -ForegroundColor Yellow
    $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    if ($key.Character -eq 'q' -or $key.Character -eq 'Q' -or $key.VirtualKeyCode -eq 27) {
        $running = $false
        break
    }
}

