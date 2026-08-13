---
name: 14-rbac
description: GBS-AIOS Skill 14 - RBAC Skill. Governs Role-Based Access Control, tenant boundary scoping, and permission matrices.
---

# Skill 14 — RBAC Skill (GBS-AIOS)

## Purpose
Governs Role-Based Access Control (RBAC) across `SUPER_ADMIN`, `PARTNER_ADMIN`, `CUSTOMER_ADMIN`, and `USER` roles, guaranteeing strict privilege boundaries.

## Responsibilities
• Enforce role validation middleware on every sensitive API endpoint and UI route.
• Ensure Partner Admins can only view and manage sub-tenants assigned to their partner organization.
• Ensure Customer Admins cannot access platform configuration or partner-level telemetry.
• Refer to `docs/rbac_and_audit_logging.md`.
