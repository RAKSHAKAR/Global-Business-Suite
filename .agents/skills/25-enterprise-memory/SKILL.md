---
name: 25-enterprise-memory
description: GBS-AIOS Skill 25 - Enterprise Memory. Stores long-term project context, cross-session decisions, and platform metadata.
---

# Skill 25 — Enterprise Memory (GBS-AIOS)

## Purpose
Serves as the long-term memory store for project state, past architectural decisions, session transcripts, and global business context.

## Responsibilities
• Maintain persistent indexing of active monorepo state across sessions.
• Store key system metrics, database table counts, API endpoint counts, and app versions.
• Provide instant context retrieval for complex multi-phase tasks without redundant code exploration.
• Synchronize with `.agents/AGENTS.md` and `skills.json` registry.
