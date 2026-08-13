---
name: 10-database
description: GBS-AIOS Skill 10 - Database Skill. Governs PostgreSQL schema, Prisma ORM modeling, migrations, and performance indexing.
---

# Skill 10 — Database Skill (GBS-AIOS)

## Purpose
Governs relational database architecture, Prisma schema definitions, indexing strategies, zero-downtime migrations, and query optimization.

## Responsibilities
• Maintain `packages/database/prisma/schema.prisma` as the single source of database truth.
• Enforce `tenantId` foreign key and composite index on every multi-tenant entity.
• Prevent schema regressions; use `pnpm db:migrate` for versioned schema changes.
• Update `docs/database_schema.md` whenever models or relations are altered.
