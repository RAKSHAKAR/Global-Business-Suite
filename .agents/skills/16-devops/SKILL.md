---
name: 16-devops
description: GBS-AIOS Skill 16 - DevOps Skill. Governs Docker containerization, process orchestration, CI/CD pipelines, and health checks.
---

# Skill 16 — DevOps Skill (GBS-AIOS)

## Purpose
Governs containerization (`docker-compose.yml`), process orchestration, port management, deployment scripts (`setup_local.ps1`, `setup_deployment.ps1`), and environment health.

## Responsibilities
• Maintain exact port bindings: API Gateway (4000), Admin (3000), Partner (3001), Customer (3002), Web (3003).
• Monitor service health via `/api/v1/health` and `/api/v1/status`.
• Ensure clean setup and startup without port conflicts or unhandled process exits.
• Refer to `docs/setup_guide.md`.
