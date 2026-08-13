# Global Business Suite (GBS) — Setup Scripts Comparison & Technical Reference

This document provides a comprehensive technical comparison between the three PowerShell setup scripts in the repository root:
1. `setup.ps1` — Master Entry Point & Dispatcher
2. `setup_local.ps1` — Local Development Orchestrator
3. `setup_deployment.ps1` — Production Deployment Orchestrator

---

## 📊 Summary Comparison Matrix

| Capability / Attribute | `setup.ps1` (Master Entry) | `setup_local.ps1` (Local Dev) | `setup_deployment.ps1` (Production) |
| :--- | :--- | :--- | :--- |
| **Primary Role** | Single entry point; dispatches parameters | Launches dev servers in separate windows | Performs release build & production DB sync |
| **Environment Target** | Local Dev & Production | Local Workstation (`localhost`) | Production Server / Staging |
| **Execution Mode** | Proxy / Forwarder | Interactive Menu & Direct CLI | Interactive Menu & Direct CLI |
| **Services Launched** | Routes to target script | 9 Services (4 Web, 3 Mobile, API, Prisma Studio) | None directly (Generates PM2 instructions) |
| **Pre-flight Checks** | Handled in target script | Node.js & `pnpm` auto-install | Node.js & `pnpm` auto-install |
| **Port Cleanup** | Handled in target script | Kills processes on ports 3000-3003, 4000, 5555, 8081-8083 | N/A |
| **Build Artifacts** | Handled in target script | Runs in `dev` mode via Turborepo | Executes `pnpm build` (Production bundles) |
| **Auto Retry Engine** | Handled in target script | 3-Attempt retry for DB & dependencies | 3-Attempt retry for DB, build & dependencies |

---

## 🛠 Script Architectural Specifications

### 1. Master Dispatcher: `setup.ps1`
* **File Path**: `setup.ps1`
* **Purpose**: Provides a unified root command (`.\setup.ps1`) for developers and CI/CD pipelines without needing to remember script sub-names.
* **Flow & Logic**:
  1. Accepts flags (`-Action`, `-DeepClean`, `-SkipInstall`, `-Production`).
  2. Inspects `$Production` or `-Action deploy`:
     * If true, forwards parameters to `setup_deployment.ps1`.
     * Otherwise, forwards parameters to `setup_local.ps1`.
  3. Propagates process exit codes safely (`$code = $LASTEXITCODE`).

### 2. Local Development Orchestrator: `setup_local.ps1`
* **File Path**: `setup_local.ps1`
* **Purpose**: End-to-end setup and launch of all 9 applications and database services for local development.
* **Key Features & Subsystems**:
  * **Interactive Console Menu**: Prompts for `Start`, `Fresh Start (Re-install)`, `Stop Services`, or `Stop + Deep Clean`.
  * **Port Sanitization (`Clear-Port`)**: Clears listening TCP sockets on ports `3000`, `3001`, `3002`, `3003`, `4000`, `5555`, `8081`, `8082`, `8083`.
  * **Deep Clean (`Invoke-DeepClean`)**: Removes `node_modules`, `.turbo`, and `.next` build caches.
  * **Database Sync**: Runs `npx prisma generate`, `npx prisma db push --accept-data-loss`, and `npx tsx prisma\seed.ts`.
  * **Multi-Window Execution**: Spawns 9 separate `cmd.exe` windows titled for each service (API Gateway, Admin Portal, Partner Portal, Customer Portal, Web Portal, Admin Mobile, Partner Mobile, Customer Mobile, Prisma Studio).
  * **Browser Auto-Launch**: Opens default browser tabs for ports `3000`, `3001`, `3002`, `3003`, and `4000/api-docs`.

### 3. Production Deployment Orchestrator: `setup_deployment.ps1`
* **File Path**: `setup_deployment.ps1`
* **Purpose**: Compiles production bundles, migrates production database schemas, seeds default admin records, and provides PM2 process manager execution instructions.
* **Key Features & Subsystems**:
  * **Pre-flight Check**: Validates Node.js (>= 18) and `pnpm` availability.
  * **Production Compilation**: Executes `pnpm build` across all workspace packages via Turborepo (`turbo.json`).
  * **Database Migration**: Generates Prisma client and applies database migrations (`pnpm exec prisma db push --accept-data-loss`).
  * **Process Manager Guidance**: Outputs ready-to-run PM2 commands for daemonizing API and Next.js applications in production environments.

---

## 🎯 Recommended Usage Commands

```powershell
# Default Interactive Mode (Local Dev)
.\setup.ps1

# Fast Local Dev Start (Skip pnpm install)
.\setup.ps1 -Action start

# Fresh Local Dev Start (Re-install dependencies & seed DB)
.\setup.ps1 -Action start -SkipInstall:$false

# Stop All Running Services & Clear Local Ports
.\setup.ps1 -Action stop

# Stop Services & Wipe Node Modules / Turbo / Next Cache
.\setup.ps1 -Action stop -DeepClean

# Production Build & Migration Pipeline
.\setup.ps1 -Action deploy
# OR
.\setup_deployment.ps1 -Action deploy
```
