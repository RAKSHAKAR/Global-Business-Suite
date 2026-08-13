---
name: 18-qa
description: GBS-AIOS Skill 18 - QA Skill. Governs functional, regression, edge-case, and user flow verification strategies.
---

# Skill 18 — QA Skill (GBS-AIOS)

## Purpose
Ensures functional correctness, end-to-end user flow integrity, edge-case handling, negative testing, and regression protection across all 4 portals and API routes.

## Responsibilities
• Define comprehensive test plans covering happy path, negative path, and boundary conditions.
• Verify multi-tenant boundary checks (attempt cross-tenant access and assert 403 Forbidden).
• Validate form inputs, Captcha validation failures, expired tokens, and rate limits.
• Refer to `docs/mobile_app_testing_and_deployment.md`.
