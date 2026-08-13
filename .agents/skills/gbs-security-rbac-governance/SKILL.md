---
name: gbs-security-rbac-governance
description: Domain skill for GBS Multi-Tenant Security, RBAC, Captcha verification, MFA, Audit Logging, and Zero-Trust Governance.
---

# GBS Security, RBAC & Governance Skill

## Core Principles
1. **Multi-Tenant Isolation**: Hard isolation of data per `tenantId`. Never bypass tenant filters in queries or API requests.
2. **Role-Based Access Control (RBAC)**: Support roles (`SUPER_ADMIN`, `PARTNER_ADMIN`, `CUSTOMER_ADMIN`, `USER`). Validate permissions on every route and server action.
3. **IAM & Authentication**: Support OAuth SSO, JWT session tokens, refresh tokens, and multi-factor authentication (MFA).
4. **Captcha Protection**: Require SVG/token Captcha verification on all public auth endpoints (login, register, reset password, lead submission).
5. **Immutable Audit Logging**: Log every sensitive mutation, login attempt, role change, or security violation to the `AuditLog` database model.
