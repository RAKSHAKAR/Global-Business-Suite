---
name: 15-security
description: GBS-AIOS Skill 15 - Security Skill. Governs OWASP Top 10 defenses, data encryption, security headers, and vulnerability mitigation.
---

# Skill 15 — Security Skill (GBS-AIOS)

## Purpose
Enforces enterprise security posture, OWASP Top 10 mitigations, data encryption at rest/in transit, zero-trust network policies, and vulnerability scans.

## Responsibilities
• Protect against SQL Injection (Prisma parameterized queries), XSS (sanitized inputs), and CSRF (SameSite cookies).
• Enforce Security Headers (Helmet, CSP, HSTS, X-Frame-Options).
• Log all security violations and suspicious requests to `AuditLog`.
• Refer to `docs/admin_security_dashboards.md`.
