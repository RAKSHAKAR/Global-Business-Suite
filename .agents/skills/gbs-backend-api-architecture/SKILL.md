---
name: gbs-backend-api-architecture
description: Domain skill for GBS Backend API Gateway, Express microservices, route controllers, and service layers.
---

# GBS Backend API Architecture Skill

## Core Principles
1. **API Gateway & Routing**: All backend routes reside in `apps/api/src/routes/`. Standardized route prefix `/api/v1/`.
2. **Controller-Service Pattern**: Keep controllers thin; delegate business logic to dedicated services under `apps/api/src/services/`.
3. **Multi-Tenant Scoping**: Every API route MUST enforce tenant isolation (`tenantId`) in query filters and payloads.
4. **Middleware Enforcements**: Mandatory authentication middleware (`authMiddleware`), RBAC check (`roleGuard`), Captcha verification (`captchaGuard`), and Audit Logger (`auditLogMiddleware`).
5. **Standardized API Responses**: Return `{ success: true, data: ... }` or `{ success: false, error: { message, code } }`. Never leak raw server stack traces.
