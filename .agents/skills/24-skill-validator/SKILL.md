---
name: 24-skill-validator
description: GBS-AIOS Skill 24 - Skill Validator. Validates skill integrity, checks for schema drift, deduplicates rules, and normalizes terminology.
---

# Skill 24 — Skill Validator (GBS-AIOS)

## Purpose
Validates the operational integrity, currency, and consistency of all 26 skills in GBS-AIOS prior to task execution.

## Responsibilities
• Perform 8-Step Validation Protocol on every task invocation.
• Check for conflicting instructions across skills; resolve via strict hierarchy (`00-core-brain` takes precedence).
• Deduplicate overlapping rules and normalize terminology across web, mobile, database, and API layers.
• Report meaningful skill updates to the user transparently.
