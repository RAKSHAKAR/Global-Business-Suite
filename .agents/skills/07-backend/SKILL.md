---
name: 07-backend
description: GBS-AIOS Skill 07 - Backend Skill. Governs Express microservices, business logic services, async jobs, and backend architecture.
---

# Skill 07 — Backend Skill (GBS-AIOS)

## Purpose
Governs backend service logic in `apps/api/src/services/`, background worker queues, event handlers, and server-side integrations.

## Responsibilities
• Maintain controller-service decoupling; controllers handle validation and routing, services execute logic.
• Ensure every async service operation is wrapped in try-catch with standardized error logging.
• Support Redis caching for frequent queries (tenant config, RBAC permission lists, session keys).
• Prevent main event loop blocking; offload heavy computations to background queues.
