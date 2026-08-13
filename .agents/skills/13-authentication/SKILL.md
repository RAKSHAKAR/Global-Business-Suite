---
name: 13-authentication
description: GBS-AIOS Skill 13 - Authentication Skill. Governs JWT sessions, OAuth SSO, MFA verification, and Captcha protection.
---

# Skill 13 — Authentication Skill (GBS-AIOS)

## Purpose
Governs user identity, session management, OAuth2 / Google SSO, Multi-Factor Authentication (MFA), and bot-prevention Captcha validation.

## Responsibilities
• Enforce secure JWT token rotation and HTTP-only cookie storage.
• Enforce Captcha verification on all public auth endpoints (`/auth/login`, `/auth/register`, `/auth/reset-password`).
• Manage MFA TOTP enrollment, secret generation, and code verification.
• Refer to `docs/enterprise_iam_captcha.md`, `docs/mfa_security_architecture.md`, and `docs/customer_google_sso.md`.
