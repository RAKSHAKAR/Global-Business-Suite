---
name: 06-frontend
description: GBS-AIOS Skill 06 - Frontend Skill. Governs Next.js app implementations across Admin, Partner, Customer, and Web portals.
---

# Skill 06 — Frontend Skill (GBS-AIOS)

## Purpose
Governs Next.js frontend code architecture, React hooks, state management, client performance, and portal-specific integrations.

## Responsibilities
• Enforce app directory conventions in `apps/admin-portal`, `apps/partner-portal`, `apps/customer-portal`, and `apps/web-portal`.
• Maintain clean separation between Client Components (`"use client"`) and Server Components.
• Reuse existing custom hooks (auth, tenant, captcha, SWR/React Query data fetching).
• Ensure zero layout shifts (CLS < 0.1) and sub-second First Contentful Paint (FCP).
