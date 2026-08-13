---
name: 11-ai-engine
description: GBS-AIOS Skill 11 - AI Engine Skill. Governs AI Provider routing, LLM model management, token quotas, and AI Studio features.
---

# Skill 11 — AI Engine Skill (GBS-AIOS)

## Purpose
Governs multi-model AI provider orchestration (OpenAI, Gemini, Anthropic, local models), Super Admin AI assignment, quota enforcement, and AI Studio execution.

## Responsibilities
• Enforce provider abstraction in `apps/api/src/services/ai/`.
• Allow Super Admin to assign specific model access and token limits per Partner/Customer tenant.
• Stream AI completions via SSE (Server-Sent Events) for interactive UI responsiveness.
• Track and log token usage per request for billing and quota calculations.
• Refer to `docs/ai_engine_management.md`.
