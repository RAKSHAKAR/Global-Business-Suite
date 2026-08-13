<#
.SYNOPSIS
  Global Business Suite (GBS) local development and update orchestrator.

.DESCRIPTION
  Interactive usage keeps the original menu choices 1-4 and adds safe update,
  validation, and status actions. Command-line actions are non-interactive and
  always return an exit code instead of waiting for a key press.

  Update safety rules:
    * The workspace must be the root of its own Git checkout.
    * Remote refs are fetched first; user files are never reset or stashed.
    * Pulls are fast-forward only and are refused when remote changes would be
      applied over a dirty or diverged working tree.

.EXAMPLE
  .\setup.ps1

.EXAMPLE
  .\setup.ps1 -Action start -SkipInstall -NoBrowser

.EXAMPLE
  .\setup.ps1 -Action update-start -NoBrowser

.EXAMPLE
  .\setup.ps1 -Action validate

.EXAMPLE
  .\setup.ps1 -Action start -DryRun -SkipInstall -NoBrowser
#>
[CmdletBinding()]
param (
    [ValidateSet('', 'start', 'start-fresh', 'update', 'update-start', 'stop', 'clean', 'status', 'validate', 'deploy')]
    [string]$Action = '',
    [switch]$DeepClean,
    [switch]$SkipInstall,
    [switch]$Production,
    [switch]$DryRun,
    [switch]$NoBrowser,
    [ValidateRange(10, 300)]
    [int]$HealthTimeoutSeconds = 90
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
$IsInteractive = [string]::IsNullOrWhiteSpace($Action) -and -not $Production

try {
    [console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {
    # Some redirected hosts do not expose a writable console encoding.
}

function Get-StateRoot {
    $safeName = ([System.IO.Path]::GetFileName($Root) -replace '[^A-Za-z0-9._-]', '-')
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Root.ToLowerInvariant())
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').Substring(0, 10).ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
    return (Join-Path ([System.IO.Path]::GetTempPath()) "gbs-orchestrator-$safeName-$hash")
}

$StateRoot = Get-StateRoot
$LogsRoot = Join-Path $StateRoot 'logs'
$ProcessStateFile = Join-Path $StateRoot 'processes.json'

function Get-ServiceDefinitions {
    return @(
        [pscustomobject]@{ Name = 'API Backend';       Port = 4000; Url = 'http://localhost:4000/api/v1/health'; Package = 'api';             Script = 'dev'; WorkingDirectory = $Root; Command = @('--filter', 'api', 'run', 'dev') },
        [pscustomobject]@{ Name = 'Admin Portal';      Port = 3000; Url = 'http://localhost:3000';               Package = 'admin-portal';    Script = 'dev'; WorkingDirectory = $Root; Command = @('--filter', 'admin-portal', 'run', 'dev') },
        [pscustomobject]@{ Name = 'Partner Portal';    Port = 3001; Url = 'http://localhost:3001';               Package = 'partner-portal';  Script = 'dev'; WorkingDirectory = $Root; Command = @('--filter', 'partner-portal', 'run', 'dev') },
        [pscustomobject]@{ Name = 'Customer Portal';   Port = 3002; Url = 'http://localhost:3002';               Package = 'customer-portal'; Script = 'dev'; WorkingDirectory = $Root; Command = @('--filter', 'customer-portal', 'run', 'dev') },
        [pscustomobject]@{ Name = 'Web Portal';        Port = 3003; Url = 'http://localhost:3003';               Package = 'web-portal';      Script = 'dev'; WorkingDirectory = $Root; Command = @('--filter', 'web-portal', 'run', 'dev') },
        [pscustomobject]@{ Name = 'Admin Mobile Web';  Port = 8081; Url = 'http://localhost:8081';               Package = 'admin-mobile';    Script = 'web'; WorkingDirectory = $Root; Command = @('--filter', 'admin-mobile', 'run', 'web', '--port', '8081', '--clear') },
        [pscustomobject]@{ Name = 'Partner Mobile Web';Port = 8082; Url = 'http://localhost:8082';               Package = 'partner-mobile';  Script = 'web'; WorkingDirectory = $Root; Command = @('--filter', 'partner-mobile', 'run', 'web', '--port', '8082', '--clear') },
        [pscustomobject]@{ Name = 'Customer Mobile Web';Port = 8083;Url = 'http://localhost:8083';               Package = 'customer-mobile'; Script = 'web'; WorkingDirectory = $Root; Command = @('--filter', 'customer-mobile', 'run', 'web', '--port', '8083', '--clear') },
        [pscustomobject]@{ Name = 'Database Portal';   Port = 5555; Url = 'http://localhost:5555';               Package = '@saas/database';  Script = 'studio'; WorkingDirectory = (Join-Path $Root 'packages\database'); Command = @('exec', 'prisma', 'studio', '--port', '5555', '--browser', 'none') }
    )
}

function Write-StatusLine {
    param(
        [ValidateSet('OK', 'INFO', 'WARN', 'ERROR', 'PLAN')]
        [string]$Kind,
        [string]$Message
    )

    $color = switch ($Kind) {
        'OK' { 'Green' }
        'INFO' { 'Cyan' }
        'WARN' { 'Yellow' }
        'ERROR' { 'Red' }
        'PLAN' { 'DarkCyan' }
    }
    Write-Host ("  [{0}] {1}" -f $Kind, $Message) -ForegroundColor $color
}

function Show-MasterBanner {
    param([switch]$Clear)

    if ($Clear) { Clear-Host }
    Write-Host ''
    Write-Host '  +===================================================================+' -ForegroundColor Cyan
    Write-Host '  |      GLOBAL BUSINESS SUITE (GBS) - Local Dev Orchestrator        |' -ForegroundColor White
    Write-Host '  +===================================================================+' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  Admin Portal      -> http://localhost:3000' -ForegroundColor DarkYellow
    Write-Host '  Partner Portal    -> http://localhost:3001' -ForegroundColor DarkYellow
    Write-Host '  Customer Portal   -> http://localhost:3002' -ForegroundColor DarkYellow
    Write-Host '  Web Portal        -> http://localhost:3003' -ForegroundColor DarkYellow
    Write-Host '  Admin Mobile Web  -> http://localhost:8081' -ForegroundColor DarkYellow
    Write-Host '  Partner Mobile Web -> http://localhost:8082' -ForegroundColor DarkYellow
    Write-Host '  Customer Mobile   -> http://localhost:8083 (web preview)' -ForegroundColor DarkYellow
    Write-Host '  API Backend       -> http://localhost:4000' -ForegroundColor DarkYellow
    Write-Host '  API Swagger       -> http://localhost:4000/api-docs' -ForegroundColor DarkYellow
    Write-Host '  DB Portal         -> http://localhost:5555' -ForegroundColor DarkYellow
    Write-Host ''
    Write-Host '  CREDENTIALS:' -ForegroundColor White
    Write-Host '    Admin:    admin@enterprise.com / Admin@1234!' -ForegroundColor Green
    Write-Host '    Partner:  partner@demo.com     / Partner@1234!' -ForegroundColor Green
    Write-Host '    Customer: customer@demo.com    / Customer@1234!' -ForegroundColor Green
    Write-Host ''
}

function ConvertTo-SingleQuotedLiteral {
    param([string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

function Format-Command {
    param([string]$Executable, [string[]]$Arguments)
    $quoted = @($Arguments | ForEach-Object {
        if ($_ -match '[\s''"]') { ConvertTo-SingleQuotedLiteral $_ } else { $_ }
    })
    return (($Executable + ' ' + ($quoted -join ' ')).Trim())
}

function Invoke-NativeStep {
    param(
        [string]$Name,
        [string]$Executable,
        [string[]]$Arguments,
        [string]$WorkingDirectory = $Root
    )

    $display = Format-Command -Executable $Executable -Arguments $Arguments
    if ($DryRun) {
        Write-StatusLine PLAN "$Name in $WorkingDirectory -> $display"
        return $true
    }

    Write-StatusLine INFO $Name
    Push-Location $WorkingDirectory
    try {
        & $Executable @Arguments
        $code = $LASTEXITCODE
    } finally {
        Pop-Location
    }
    if ($code -ne 0) {
        Write-StatusLine ERROR "$Name failed with exit code $code."
        return $false
    }
    Write-StatusLine OK "$Name completed."
    return $true
}

function Test-CommandAvailable {
    param([string]$Name, [switch]$Required)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        if ($Required) {
            Write-StatusLine ERROR "$Name is not installed or is not available in PATH."
        } else {
            Write-StatusLine WARN "$Name is not available in PATH."
        }
        return $false
    }
    return $true
}

function Test-PreflightEnvironment {
    param([switch]$RequireGit)

    $valid = $true
    if (-not (Test-CommandAvailable -Name 'node' -Required)) { $valid = $false }
    if (-not (Test-CommandAvailable -Name 'pnpm' -Required)) { $valid = $false }
    if ($RequireGit -and -not (Test-CommandAvailable -Name 'git' -Required)) { $valid = $false }
    if (-not $valid) { return $false }

    $nodeVersion = (& node --version).Trim()
    $pnpmVersion = (& pnpm --version).Trim()
    Write-StatusLine OK "Node.js $nodeVersion"
    Write-StatusLine OK "pnpm $pnpmVersion"

    $majorText = $nodeVersion.TrimStart('v').Split('.')[0]
    $nodeMajor = 0
    if (-not [int]::TryParse($majorText, [ref]$nodeMajor) -or $nodeMajor -lt 22) {
        Write-StatusLine ERROR "Node.js 22 or newer is required by package.json; found $nodeVersion."
        return $false
    }
    return $true
}

function Test-GitWorkspaceRoot {
    param([switch]$Advisory)

    if (-not (Test-CommandAvailable -Name 'git')) { return $false }
    $failureKind = 'ERROR'
    if ($Advisory) { $failureKind = 'WARN' }

    $gitRootOutput = & git -C $Root rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($gitRootOutput | Out-String))) {
        Write-StatusLine $failureKind 'This workspace is not a Git checkout, so it cannot be updated automatically.'
        return $false
    }

    $gitRoot = [System.IO.Path]::GetFullPath(($gitRootOutput | Select-Object -First 1).Trim()).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    if (-not $gitRoot.Equals($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-StatusLine $failureKind "Automatic update refused: this workspace is nested under Git root '$gitRoot' instead of being its own tracked checkout."
        Write-StatusLine INFO 'Clone or configure the intended repository at this workspace root; the orchestrator will not pull an unrelated parent repository.'
        return $false
    }
    return $true
}

function Invoke-GitCapture {
    param([string[]]$Arguments)
    # Windows PowerShell promotes native stderr to ErrorRecord objects. Git
    # writes normal fetch/pull progress to stderr, so capture it without
    # allowing those informational lines to terminate the orchestrator.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & git -C $Root @Arguments 2>&1
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    return [pscustomobject]@{ Code = $code; Text = (($output | Out-String).Trim()) }
}

function Invoke-SafeUpdate {
    Write-Host ''
    Write-Host '  SAFE WORKSPACE UPDATE' -ForegroundColor White
    Write-Host '  -------------------------------------------------------------------' -ForegroundColor DarkGray

    if (-not (Test-CommandAvailable -Name 'git' -Required)) { return $false }
    if (-not (Test-GitWorkspaceRoot)) { return $false }

    $branchResult = Invoke-GitCapture @('symbolic-ref', '--quiet', '--short', 'HEAD')
    if ($branchResult.Code -ne 0) {
        Write-StatusLine ERROR 'Automatic update is unavailable on a detached HEAD. Check out a branch first.'
        return $false
    }

    $upstreamResult = Invoke-GitCapture @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
    if ($upstreamResult.Code -ne 0 -or [string]::IsNullOrWhiteSpace($upstreamResult.Text)) {
        Write-StatusLine ERROR "Branch '$($branchResult.Text)' has no upstream. Configure one before using automatic update."
        return $false
    }

    Write-StatusLine INFO "Branch: $($branchResult.Text); upstream: $($upstreamResult.Text)"
    if ($DryRun) {
        Write-StatusLine PLAN 'git fetch --prune, compare HEAD with upstream, and git pull --ff-only only when clean and behind.'
        return $true
    }

    $fetchResult = Invoke-GitCapture @('fetch', '--prune')
    if ($fetchResult.Code -ne 0) {
        Write-StatusLine ERROR "Git fetch failed. $($fetchResult.Text)"
        return $false
    }
    Write-StatusLine OK 'Remote references fetched.'

    $countsResult = Invoke-GitCapture @('rev-list', '--left-right', '--count', "HEAD...$($upstreamResult.Text)")
    if ($countsResult.Code -ne 0) {
        Write-StatusLine ERROR "Could not compare the local and upstream commits. $($countsResult.Text)"
        return $false
    }

    $countParts = $countsResult.Text -split '\s+'
    if ($countParts.Count -lt 2) {
        Write-StatusLine ERROR "Unexpected Git revision count: '$($countsResult.Text)'."
        return $false
    }
    $ahead = [int]$countParts[0]
    $behind = [int]$countParts[1]

    if ($behind -eq 0) {
        if ($ahead -gt 0) {
            Write-StatusLine INFO "No remote update is pending; the local branch is $ahead commit(s) ahead."
        } else {
            Write-StatusLine OK 'The workspace is already up to date.'
        }
        return $true
    }

    if ($ahead -gt 0) {
        Write-StatusLine ERROR "Update refused: local and remote histories have diverged (ahead $ahead, behind $behind). Resolve the branch manually."
        return $false
    }

    $statusResult = Invoke-GitCapture @('status', '--porcelain=v1', '--untracked-files=all', '--', '.')
    if ($statusResult.Code -ne 0) {
        Write-StatusLine ERROR "Could not inspect workspace changes. $($statusResult.Text)"
        return $false
    }
    if (-not [string]::IsNullOrWhiteSpace($statusResult.Text)) {
        Write-StatusLine ERROR "Remote has $behind new commit(s), but the workspace contains local changes. Nothing was pulled."
        Write-StatusLine INFO 'Commit or manually preserve those changes, then run Update + Start again. The orchestrator never auto-stashes or resets files.'
        return $false
    }

    $oldRevision = (Invoke-GitCapture @('rev-parse', '--short', 'HEAD')).Text
    $pullResult = Invoke-GitCapture @('pull', '--ff-only')
    if ($pullResult.Code -ne 0) {
        Write-StatusLine ERROR "Fast-forward pull failed. $($pullResult.Text)"
        return $false
    }
    $newRevision = (Invoke-GitCapture @('rev-parse', '--short', 'HEAD')).Text
    Write-StatusLine OK "Updated $oldRevision -> $newRevision with a fast-forward pull."
    return $true
}

function Test-PortListening {
    param([int]$Port, [int]$TimeoutMilliseconds = 250)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMilliseconds, $false)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Get-PortProcessIds {
    param([int]$Port)
    try {
        return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique)
    } catch {
        return @()
    }
}

function Get-DescendantProcessIds {
    param(
        [int[]]$RootProcessIds,
        [object[]]$ProcessSnapshot
    )

    $collected = [System.Collections.Generic.HashSet[int]]::new()
    $queue = [System.Collections.Generic.Queue[int]]::new()
    foreach ($rootProcessId in $RootProcessIds) {
        if ($rootProcessId -gt 0 -and $collected.Add($rootProcessId)) {
            $queue.Enqueue($rootProcessId)
        }
    }

    while ($queue.Count -gt 0) {
        $parentProcessId = $queue.Dequeue()
        foreach ($child in @($ProcessSnapshot | Where-Object { [int]$_.ParentProcessId -eq $parentProcessId })) {
            $childProcessId = [int]$child.ProcessId
            if ($collected.Add($childProcessId)) {
                $queue.Enqueue($childProcessId)
            }
        }
    }

    return @($collected)
}

function Get-RecordedLauncherProcessIds {
    if (-not (Test-Path -LiteralPath $ProcessStateFile)) { return @() }
    try {
        $records = @(Get-Content -LiteralPath $ProcessStateFile -Raw | ConvertFrom-Json)
        return @($records | Where-Object { $null -ne $_.Pid -and [int]$_.Pid -gt 0 } |
            ForEach-Object { [int]$_.Pid })
    } catch {
        Write-StatusLine WARN "Could not read launcher process state: $($_.Exception.Message)"
        return @()
    }
}

function Get-WorkspaceServiceProcessIds {
    param([object[]]$ProcessSnapshot)

    $escapedRoot = [regex]::Escape($Root)
    $serviceCommandPattern = '(?i)(nodemon(?:\.js)?\s+--watch\s+src|ts-node(?:\.js)?[^\r\n]*src[/\\]index\.ts|next[^\r\n]*(?:dev|start-server\.js)|expo[^\r\n]*start[^\r\n]*--web|prisma[^\r\n]*studio)'
    return @($ProcessSnapshot | Where-Object {
        -not [string]::IsNullOrWhiteSpace([string]$_.CommandLine) -and
        [string]$_.CommandLine -match $escapedRoot -and
        [string]$_.CommandLine -match $serviceCommandPattern
    } | ForEach-Object { [int]$_.ProcessId })
}

function Show-ServiceStatus {
    Write-Host ''
    Write-Host '  SERVICE STATUS' -ForegroundColor White
    Write-Host '  -------------------------------------------------------------------' -ForegroundColor DarkGray
    foreach ($service in (Get-ServiceDefinitions)) {
        $pids = @(Get-PortProcessIds -Port $service.Port)
        if ($pids.Count -gt 0) {
            Write-StatusLine OK ("{0,-20} port {1} listening (PID {2})" -f $service.Name, $service.Port, ($pids -join ', '))
        } else {
            Write-StatusLine INFO ("{0,-20} port {1} stopped" -f $service.Name, $service.Port)
        }
    }
    Write-StatusLine INFO "Launcher logs: $LogsRoot"
    return $true
}

function Stop-AllServices {
    Write-Host ''
    Write-Host '  STOPPING LOCAL SERVICES' -ForegroundColor White
    Write-Host '  -------------------------------------------------------------------' -ForegroundColor DarkGray

    $processSnapshot = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
    $recordedProcessIds = @(Get-RecordedLauncherProcessIds)
    $workspaceServiceProcessIds = @(Get-WorkspaceServiceProcessIds -ProcessSnapshot $processSnapshot)
    $portProcessIds = @()
    foreach ($service in (Get-ServiceDefinitions)) {
        $pids = @(Get-PortProcessIds -Port $service.Port)
        if ($pids.Count -eq 0) {
            Write-StatusLine INFO "$($service.Name) is already stopped."
        } else {
            $portProcessIds += $pids
            Write-StatusLine INFO "$($service.Name) owns port $($service.Port) with PID(s) $($pids -join ', ')."
        }
    }

    $rootProcessIds = @($recordedProcessIds + $workspaceServiceProcessIds + $portProcessIds |
        Where-Object { [int]$_ -gt 0 } | Select-Object -Unique)
    $processIdsToStop = @(Get-DescendantProcessIds -RootProcessIds $rootProcessIds -ProcessSnapshot $processSnapshot)

    # Stop children before their parents so package runners cannot leave a
    # watcher or HTTP child behind after the listening process exits.
    [array]::Reverse($processIdsToStop)
    foreach ($processId in $processIdsToStop) {
        $processInfo = $processSnapshot | Where-Object { [int]$_.ProcessId -eq [int]$processId } | Select-Object -First 1
        if ($DryRun) {
            $processName = if ($null -ne $processInfo) { $processInfo.Name } else { 'process' }
            Write-StatusLine PLAN "Stop $processName (PID $processId) from the GBS service tree."
            continue
        }
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-StatusLine OK "Stopped $($process.ProcessName) (PID $processId)."
        } catch {
            if ($null -ne (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
                Write-StatusLine WARN "Could not stop PID ${processId}: $($_.Exception.Message)"
            }
        }
    }

    if (-not $DryRun) {
        Start-Sleep -Milliseconds 500
        $remainingPorts = @((Get-ServiceDefinitions) | Where-Object { @(Get-PortProcessIds -Port $_.Port).Count -gt 0 })
        if ($remainingPorts.Count -gt 0) {
            foreach ($service in $remainingPorts) {
                Write-StatusLine WARN "$($service.Name) is still listening on port $($service.Port)."
            }
            return $false
        }
    }

    if (-not $DryRun -and (Test-Path -LiteralPath $ProcessStateFile)) {
        Remove-Item -LiteralPath $ProcessStateFile -Force -ErrorAction SilentlyContinue
    }
    return $true
}

function Remove-SafeWorkspaceDirectory {
    param([string]$Path)
    $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $rootPrefix = $Root + [System.IO.Path]::DirectorySeparatorChar
    if ($fullPath.Equals($Root, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to recursively remove unsafe path '$fullPath'."
    }
    if (-not (Test-Path -LiteralPath $fullPath)) { return }
    if ($DryRun) {
        Write-StatusLine PLAN "Remove directory $fullPath"
        return
    }
    Remove-Item -LiteralPath $fullPath -Recurse -Force
    Write-StatusLine OK "Removed $fullPath"
}

function Invoke-DeepClean {
    Write-Host ''
    Write-Host '  DEEP CLEAN' -ForegroundColor White
    Write-Host '  -------------------------------------------------------------------' -ForegroundColor DarkGray
    Remove-SafeWorkspaceDirectory (Join-Path $Root 'node_modules')
    Remove-SafeWorkspaceDirectory (Join-Path $Root '.turbo')
    $appsRoot = Join-Path $Root 'apps'
    if (Test-Path -LiteralPath $appsRoot) {
        $buildDirectories = @(Get-ChildItem -LiteralPath $appsRoot -Directory -Recurse -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -in @('.next', '.expo') })
        foreach ($directory in $buildDirectories) {
            Remove-SafeWorkspaceDirectory $directory.FullName
        }
    }
    Write-StatusLine OK 'Deep clean completed.'
    return $true
}

function Test-WorkspaceConfiguration {
    Write-Host ''
    Write-Host '  NON-INTERACTIVE LAUNCHER VALIDATION' -ForegroundColor White
    Write-Host '  -------------------------------------------------------------------' -ForegroundColor DarkGray
    $valid = Test-PreflightEnvironment

    $rootManifestPath = Join-Path $Root 'package.json'
    if (-not (Test-Path -LiteralPath $rootManifestPath)) {
        Write-StatusLine ERROR "Missing root package.json at $rootManifestPath"
        $valid = $false
    } else {
        try {
            $rootManifest = Get-Content -LiteralPath $rootManifestPath -Raw | ConvertFrom-Json
            if ($rootManifest.packageManager -notmatch '^pnpm@') {
                Write-StatusLine ERROR 'Root package.json must declare a pnpm packageManager.'
                $valid = $false
            } else {
                Write-StatusLine OK "Root package manager: $($rootManifest.packageManager)"
            }
        } catch {
            Write-StatusLine ERROR "Invalid root package.json: $($_.Exception.Message)"
            $valid = $false
        }
    }

    $services = @(Get-ServiceDefinitions)
    if ($services.Count -ne 9) {
        Write-StatusLine ERROR "Expected 9 local services, found $($services.Count)."
        $valid = $false
    }
    $uniquePorts = @($services | Select-Object -ExpandProperty Port -Unique)
    if ($uniquePorts.Count -ne $services.Count) {
        Write-StatusLine ERROR 'Service ports must be unique.'
        $valid = $false
    }

    foreach ($service in $services) {
        if ($service.Package -eq '@saas/database') { continue }
        $manifestPath = Join-Path $Root ("apps\{0}\package.json" -f $service.Package)
        if (-not (Test-Path -LiteralPath $manifestPath)) {
            Write-StatusLine ERROR "Missing manifest for $($service.Name): $manifestPath"
            $valid = $false
            continue
        }
        try {
            $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
            if ($manifest.name -ne $service.Package) {
                Write-StatusLine ERROR "$manifestPath declares '$($manifest.name)', expected '$($service.Package)'."
                $valid = $false
            }
            $scriptNames = @($manifest.scripts.PSObject.Properties.Name)
            if ($scriptNames -notcontains $service.Script) {
                Write-StatusLine ERROR "$($service.Name) has no '$($service.Script)' script."
                $valid = $false
            } else {
                Write-StatusLine OK ("{0,-20} package/script valid on port {1}" -f $service.Name, $service.Port)
            }
        } catch {
            Write-StatusLine ERROR "Invalid manifest ${manifestPath}: $($_.Exception.Message)"
            $valid = $false
        }
    }

    $databaseManifestPath = Join-Path $Root 'packages\database\package.json'
    $schemaPath = Join-Path $Root 'packages\database\prisma\schema.prisma'
    if ((Test-Path -LiteralPath $databaseManifestPath) -and (Test-Path -LiteralPath $schemaPath)) {
        Write-StatusLine OK 'Database package and Prisma schema are present.'
    } else {
        Write-StatusLine ERROR 'Database package or Prisma schema is missing.'
        $valid = $false
    }

    if (Test-GitWorkspaceRoot -Advisory) {
        Write-StatusLine OK 'Safe automatic updates are available for this checkout.'
    } else {
        Write-StatusLine WARN 'Service launch is valid, but automatic update is disabled until this folder is its own Git checkout.'
    }

    foreach ($service in $services) {
        if (Test-PortListening -Port $service.Port) {
            Write-StatusLine INFO "$($service.Name) currently occupies port $($service.Port)."
        }
    }

    if ($valid) {
        Write-StatusLine OK 'Launcher validation passed for all 9 declared services.'
    } else {
        Write-StatusLine ERROR 'Launcher validation failed. Resolve the errors above before starting services.'
    }
    return $valid
}

function Test-PortAvailabilityForStart {
    $conflicts = @()
    foreach ($service in (Get-ServiceDefinitions)) {
        if (Test-PortListening -Port $service.Port) { $conflicts += $service }
    }
    if ($conflicts.Count -eq 0) { return $true }
    foreach ($service in $conflicts) {
        $pids = @(Get-PortProcessIds -Port $service.Port)
        Write-StatusLine ERROR "$($service.Name) cannot start because port $($service.Port) is already listening (PID: $($pids -join ', '))."
    }
    Write-StatusLine INFO 'Run .\setup.ps1 -Action stop first if those listeners are the previous GBS services.'
    return $false
}

function Invoke-DatabasePreparation {
    $databaseRoot = Join-Path $Root 'packages\database'
    if (-not (Invoke-NativeStep -Name 'Generate Prisma client' -Executable 'pnpm' -Arguments @('exec', 'prisma', 'generate') -WorkingDirectory $databaseRoot)) { return $false }
    if (-not (Invoke-NativeStep -Name 'Synchronize local database schema (non-destructive mode)' -Executable 'pnpm' -Arguments @('exec', 'prisma', 'db', 'push') -WorkingDirectory $databaseRoot)) { return $false }
    # This idempotent seed is the source of truth for the three credentials
    # displayed by the orchestrator and for their RBAC permissions.
    $seedPath = Join-Path $databaseRoot 'seed-users.ts'
    if (Test-Path -LiteralPath $seedPath) {
        if (-not (Invoke-NativeStep -Name 'Seed local users, roles, and platform defaults' -Executable 'pnpm' -Arguments @('exec', 'tsx', 'packages\database\seed-users.ts') -WorkingDirectory $Root)) { return $false }
    } else {
        Write-StatusLine WARN 'No database seed file found; seed step skipped.'
    }
    return $true
}

function Start-ServiceProcess {
    param([pscustomobject]$Service, [string]$PnpmPath)

    $displayCommand = Format-Command -Executable 'pnpm' -Arguments $Service.Command
    if ($DryRun) {
        Write-StatusLine PLAN "$($Service.Name) on port $($Service.Port) -> $displayCommand"
        return [pscustomobject]@{ Name = $Service.Name; Port = $Service.Port; Url = $Service.Url; Pid = 0; StartedAt = ''; DryRun = $true }
    }

    if (-not (Test-Path -LiteralPath $LogsRoot)) {
        New-Item -ItemType Directory -Path $LogsRoot -Force | Out-Null
    }
    $slug = ($Service.Name.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
    $stdoutPath = Join-Path $LogsRoot "$slug.stdout.log"
    $stderrPath = Join-Path $LogsRoot "$slug.stderr.log"
    if (Test-Path -LiteralPath $stdoutPath) { Remove-Item -LiteralPath $stdoutPath -Force }
    if (Test-Path -LiteralPath $stderrPath) { Remove-Item -LiteralPath $stderrPath -Force }

    $argumentText = (($Service.Command | ForEach-Object { ConvertTo-SingleQuotedLiteral $_ }) -join ' ')
    $workingDirectoryLiteral = ConvertTo-SingleQuotedLiteral $Service.WorkingDirectory
    $pnpmLiteral = ConvertTo-SingleQuotedLiteral $PnpmPath
    $launchCommand = @"
Set-Location -LiteralPath $workingDirectoryLiteral
`$env:BROWSER = 'none'
`$env:EXPO_NO_DOCTOR = '1'
& $pnpmLiteral $argumentText
exit `$LASTEXITCODE
"@
    $encodedCommand = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($launchCommand))
    $hostCommand = Get-Command 'powershell.exe' -ErrorAction SilentlyContinue
    if ($null -eq $hostCommand) { $hostCommand = Get-Command 'pwsh' -ErrorAction Stop }

    $process = Start-Process -FilePath $hostCommand.Source `
        -ArgumentList @('-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encodedCommand) `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutPath `
        -RedirectStandardError $stderrPath `
        -PassThru

    $startedAt = $process.StartTime.ToUniversalTime().ToString('o')
    Write-StatusLine INFO "$($Service.Name) launched as PID $($process.Id); waiting for port $($Service.Port)."
    return [pscustomobject]@{ Name = $Service.Name; Port = $Service.Port; Url = $Service.Url; Pid = $process.Id; StartedAt = $startedAt; DryRun = $false }
}

function Test-ServiceHttpReady {
    param([pscustomobject]$Service)
    if (-not (Test-PortListening -Port ([int]$Service.Port) -TimeoutMilliseconds 250)) { return $false }
    try {
        $response = Invoke-WebRequest -Uri $Service.Url -UseBasicParsing -TimeoutSec 3 -MaximumRedirection 5
        return ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 500)
    } catch {
        # Authentication responses still prove that the intended HTTP service is
        # alive; connection failures and server errors do not.
        $responseProperty = $_.Exception.PSObject.Properties['Response']
        if ($null -ne $responseProperty -and $null -ne $responseProperty.Value) {
            $statusCode = [int]$responseProperty.Value.StatusCode
            return ($statusCode -ge 200 -and $statusCode -lt 500)
        }
        return $false
    }
}

function Wait-ForServices {
    param([object[]]$LaunchedServices)
    if ($DryRun) { return $true }

    $pending = @{}
    foreach ($service in $LaunchedServices) { $pending[[int]$service.Port] = $service.Name }
    $deadline = [DateTime]::UtcNow.AddSeconds($HealthTimeoutSeconds)
    while ($pending.Count -gt 0 -and [DateTime]::UtcNow -lt $deadline) {
        foreach ($port in @($pending.Keys)) {
            $service = $LaunchedServices | Where-Object { [int]$_.Port -eq [int]$port } | Select-Object -First 1
            if ($null -ne $service -and (Test-ServiceHttpReady -Service $service)) {
                Write-StatusLine OK "$($pending[$port]) passed HTTP readiness on port $port."
                $pending.Remove($port)
            }
        }
        if ($pending.Count -gt 0) { Start-Sleep -Milliseconds 750 }
    }

    if ($pending.Count -eq 0) { return $true }
    foreach ($port in @($pending.Keys)) {
        Write-StatusLine ERROR "$($pending[$port]) did not listen on port $port within $HealthTimeoutSeconds seconds."
    }
    Write-StatusLine INFO "Inspect service logs in $LogsRoot"
    return $false
}

function Open-LocalPortals {
    if ($NoBrowser -or $DryRun) {
        if ($DryRun) { Write-StatusLine PLAN 'Browser launch suppressed by dry-run.' }
        return
    }
    foreach ($url in @(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:4000/api-docs'
    )) {
        Start-Process $url
    }
}

function Start-AllServices {
    param([switch]$InstallDependencies)

    Write-Host ''
    Write-Host '  STARTING ALL 9 LOCAL SERVICES' -ForegroundColor White
    Write-Host '  -------------------------------------------------------------------' -ForegroundColor DarkGray
    if (-not (Test-PreflightEnvironment)) { return $false }
    if (-not (Test-WorkspaceConfiguration)) { return $false }
    if (-not $DryRun -and -not (Test-PortAvailabilityForStart)) { return $false }

    if ($InstallDependencies -and -not $SkipInstall) {
        if (-not (Invoke-NativeStep -Name 'Install workspace dependencies' -Executable 'pnpm' -Arguments @('install', '--config.confirmModulesPurge=false') -WorkingDirectory $Root)) { return $false }
    } elseif (-not $DryRun -and -not (Test-Path -LiteralPath (Join-Path $Root 'node_modules'))) {
        Write-StatusLine ERROR 'node_modules is missing. Run Start + Re-install dependencies or remove -SkipInstall.'
        return $false
    } else {
        Write-StatusLine INFO 'Dependency installation skipped.'
    }

    if (-not (Invoke-DatabasePreparation)) { return $false }

    $pnpmCommand = Get-Command 'pnpm.cmd' -ErrorAction SilentlyContinue
    if ($null -eq $pnpmCommand) { $pnpmCommand = Get-Command 'pnpm' -ErrorAction Stop }
    $launched = @()
    foreach ($service in (Get-ServiceDefinitions)) {
        try {
            $launched += Start-ServiceProcess -Service $service -PnpmPath $pnpmCommand.Source
        } catch {
            Write-StatusLine ERROR "Could not launch $($service.Name): $($_.Exception.Message)"
            if (-not $DryRun -and $launched.Count -gt 0) {
                if (-not (Test-Path -LiteralPath $StateRoot)) { New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null }
                $launched | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ProcessStateFile -Encoding UTF8
                Write-StatusLine INFO 'Previously launched services were recorded; use -Action stop to stop them.'
            }
            return $false
        }
    }

    if (-not $DryRun) {
        if (-not (Test-Path -LiteralPath $StateRoot)) { New-Item -ItemType Directory -Path $StateRoot -Force | Out-Null }
        $launched | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ProcessStateFile -Encoding UTF8
    }

    $healthy = Wait-ForServices -LaunchedServices $launched
    if (-not $healthy) { return $false }
    Open-LocalPortals
    if ($DryRun) {
        Write-StatusLine OK 'Dry-run validated all 9 launch commands; no service was started.'
    } else {
        Write-StatusLine OK 'All 9 services are ready.'
    }
    Write-StatusLine INFO "Logs: $LogsRoot"
    return $true
}

function Invoke-ProductionBuild {
    if (-not (Test-PreflightEnvironment)) { return $false }
    if (-not $SkipInstall) {
        if (-not (Invoke-NativeStep -Name 'Install workspace dependencies' -Executable 'pnpm' -Arguments @('install', '--config.confirmModulesPurge=false') -WorkingDirectory $Root)) { return $false }
    }
    if (-not (Invoke-NativeStep -Name 'Generate Prisma client' -Executable 'pnpm' -Arguments @('--dir', 'packages\database', 'exec', 'prisma', 'generate') -WorkingDirectory $Root)) { return $false }
    if (-not (Invoke-NativeStep -Name 'Build Turborepo projects' -Executable 'pnpm' -Arguments @('build') -WorkingDirectory $Root)) { return $false }
    Write-StatusLine OK 'Production build completed.'
    return $true
}

function Invoke-RequestedAction {
    param([string]$RequestedAction)

    $normalizedAction = $RequestedAction.ToLowerInvariant()
    switch ($normalizedAction) {
        'start' {
            return (Start-AllServices -InstallDependencies:(-not $SkipInstall))
        }
        'start-fresh' {
            return (Start-AllServices -InstallDependencies)
        }
        'update' {
            return (Invoke-SafeUpdate)
        }
        'update-start' {
            if (-not (Invoke-SafeUpdate)) {
                Write-StatusLine ERROR 'Start was cancelled because the safe update did not complete.'
                return $false
            }
            return (Start-AllServices -InstallDependencies:(-not $SkipInstall))
        }
        'stop' {
            $stopped = Stop-AllServices
            if ($DeepClean) { return (Invoke-DeepClean) }
            return $stopped
        }
        'clean' {
            [void](Stop-AllServices)
            return (Invoke-DeepClean)
        }
        'status' {
            return (Show-ServiceStatus)
        }
        'validate' {
            return (Test-WorkspaceConfiguration)
        }
        'deploy' {
            return (Invoke-ProductionBuild)
        }
        default {
            Write-StatusLine ERROR "Unknown action '$RequestedAction'."
            return $false
        }
    }
}

function Show-InteractiveMenu {
    Show-MasterBanner -Clear
    Write-Host '  What would you like to do?' -ForegroundColor White
    Write-Host ''
    Write-Host '  -- START ------------------------------------------------------------------' -ForegroundColor DarkGray
    Write-Host '  [1]  Start current workspace (all 9 services; no Git update)' -ForegroundColor Cyan
    Write-Host '  [2]  Re-install dependencies + Start current workspace' -ForegroundColor Cyan
    Write-Host '  [5]  Safely Update + Install + Start all services' -ForegroundColor Green
    Write-Host ''
    Write-Host '  -- UPDATE / CHECK ---------------------------------------------------------' -ForegroundColor DarkGray
    Write-Host '  [6]  Safely fetch and apply updates only (fast-forward)' -ForegroundColor Cyan
    Write-Host '  [7]  Validate launcher and all service declarations' -ForegroundColor Cyan
    Write-Host '  [8]  Show current service/port status' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '  -- STOP -------------------------------------------------------------------' -ForegroundColor DarkGray
    Write-Host '  [3]  Stop services              (kill the 9 declared ports)' -ForegroundColor Cyan
    Write-Host '  [4]  Stop + Deep Clean          (node_modules, .turbo, .next, .expo)' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '  -- EXIT -------------------------------------------------------------------' -ForegroundColor DarkGray
    Write-Host '  [0]  Exit orchestrator' -ForegroundColor DarkGray
    Write-Host ''

    $choice = ''
    while ($choice -notmatch '^[0-8]$') { $choice = Read-Host '  Enter choice [0-8]' }
    switch ($choice) {
        '1' { $script:SkipInstall = $true; return 'start' }
        '2' { $script:SkipInstall = $false; return 'start-fresh' }
        '3' { return 'stop' }
        '4' { return 'clean' }
        '5' { $script:SkipInstall = $false; return 'update-start' }
        '6' { return 'update' }
        '7' { return 'validate' }
        '8' { return 'status' }
        '0' { return 'exit' }
    }
}

if ($Production) { $Action = 'deploy' }

if (-not $IsInteractive) {
    Show-MasterBanner
    $success = Invoke-RequestedAction -RequestedAction $Action
    if ($success) { exit 0 }
    exit 1
}

while ($true) {
    $menuAction = Show-InteractiveMenu
    if ($menuAction -eq 'exit') {
        Write-Host '  Exiting GBS Orchestrator. Goodbye!' -ForegroundColor Cyan
        exit 0
    }
    [void](Invoke-RequestedAction -RequestedAction $menuAction)
    Write-Host ''
    [void](Read-Host '  Press Enter to return to the Start Menu')
}
