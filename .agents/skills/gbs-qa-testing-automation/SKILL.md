---
name: gbs-qa-testing-automation
description: Domain skill for GBS Automated E2E testing (Playwright), API testing, unit tests, and performance benchmarks.
---

# GBS QA & Testing Automation Skill

## Core Principles
1. **Automated Verification**: Run Playwright E2E suites (`test-e2e.mjs`, `test-partner.js`, etc.) and Node API integration scripts after changes.
2. **Zero Breaking Changes**: Validate across all 4 portals (Admin, Partner, Customer, Web) and API Gateway before marking any task complete.
3. **Negative & Edge Case Coverage**: Test unauthorized requests, invalid Captchas, tenant cross-access attempts, and missing parameters.
4. **Performance & SLA Benchmarks**: Ensure API response times remain under 200ms and web pages achieve high Lighthouse scores.
