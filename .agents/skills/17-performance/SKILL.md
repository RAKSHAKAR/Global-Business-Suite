---
name: 17-performance
description: GBS-AIOS Skill 17 - Performance Skill. Governs frontend rendering metrics, API response SLAs, database query latency, and memory usage.
---

# Skill 17 — Performance Skill (GBS-AIOS)

## Purpose
Enforces performance SLAs, minimal bundle size, efficient database queries, latency bounds (<200ms API SLA), and zero memory leaks.

## Responsibilities
• Audit bundle sizes; eliminate unused imports or redundant dependencies.
• Optimize Prisma database queries (avoid N+1 queries using `include` / `select`).
• Leverage browser caching and CDN asset delivery.
• Conduct load and latency checks on critical API routes under load.
