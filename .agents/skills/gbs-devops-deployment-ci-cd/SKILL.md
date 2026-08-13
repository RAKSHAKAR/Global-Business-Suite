---
name: gbs-devops-deployment-ci-cd
description: Domain skill for GBS Containerization, Docker Compose, PowerShell deployment scripts, port orchestrations, and health monitoring.
---

# GBS DevOps & Deployment Skill

## Core Principles
1. **Service Port Allocations**:
   - API Gateway: Port 4000
   - Admin Portal: Port 3000
   - Partner Portal: Port 3001
   - Customer Portal: Port 3002
   - Web Portal: Port 3003
2. **Container & Process Management**: Standardized orchestration using `docker-compose.yml`, TurboRepo pipelines (`pnpm build`, `pnpm dev`), and powershell scripts (`setup_local.ps1`, `setup_deployment.ps1`).
3. **Environment Security**: Keep production secrets out of source control. Use `.env` variables with explicit validation schemas.
4. **Zero-Downtime Releases**: Validate system health checks (`/api/v1/health`) before routing traffic to newly deployed instances.
