---
name: gbs-database-prisma-orm
description: Domain skill for GBS PostgreSQL Database, Prisma ORM schemas, indexing, migrations, and transactional integrity.
---

# GBS Database & Prisma ORM Skill

## Core Principles
1. **Single Source Schema**: All data models are declared in `packages/database/prisma/schema.prisma`.
2. **Migration Discipline**: Use `pnpm db:migrate` or `prisma migrate dev` for schema changes. Never directly mutate DB tables out-of-band.
3. **Optimized Indexing**: Add database indexes on foreign keys, `tenantId`, `email`, `createdAt`, and high-frequency search fields.
4. **Transactional Safety**: Wrap multi-entity mutations in `prisma.$transaction([])` to guarantee atomicity.
5. **No Data Loss**: Never drop columns or tables without prior migration plan and zero-downtime backup strategy.
