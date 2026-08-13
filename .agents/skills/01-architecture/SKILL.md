---
name: 01-architecture
description: GBS-AIOS Skill 01 - Enterprise Architecture Skill. Governs monorepo topology, app relationships, multi-tenant boundaries, and system dependencies.
---

# Skill 01 — Enterprise Architecture Skill (GBS-AIOS)

## Purpose
Maintains complete architectural context for the Global Business Suite (GBS) monorepo across all apps, packages, services, boundaries, and dependencies.

## Responsibilities
• Enforce TurboRepo workspace topology (`apps/*`, `packages/*`).
• Maintain system topology awareness:
  - `apps/api`: Express API Gateway, Controllers, Services.
  - `apps/admin-portal`: Vanguard Super Admin Platform (Port 3000).
  - `apps/partner-portal`: Partner Ecosystem Portal (Port 3001).
  - `apps/customer-portal`: End-Customer SaaS Management (Port 3002).
  - `apps/web-portal`: Public Marketing & SSO Landing (Port 3003).
  - `apps/admin-mobile`, `apps/partner-mobile`, `apps/customer-mobile`: Expo / React Native mobile apps.
  - `packages/database`: Shared Prisma ORM and DB Client.
  - `packages/gbs-design-system.css`: Unified Enterprise CSS Tokens.
• Inspect `docs/master_system_architecture.md` and `docs/apps_structure.md` before approving structural changes.

## Integration with Other Skills
• Feeds architecture graphs into `00-core-brain`.
• Enforces system boundary rules for `06-frontend`, `07-backend`, `08-mobile`, and `10-database`.
