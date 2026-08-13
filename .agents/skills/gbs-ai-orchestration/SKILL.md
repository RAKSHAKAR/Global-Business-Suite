---
name: gbs-ai-orchestration
description: Domain skill for GBS AI Provider routing, model assignment, token quota enforcement, and multi-LLM orchestration.
---

# GBS AI Engine & Orchestration Skill

## Core Principles
1. **Multi-Provider Support**: Support OpenAI, Google Gemini, Anthropic, and local LLM engines through a unified provider interface in `apps/api/src/services/ai/`.
2. **Super Admin Assignment**: Super Admin can assign specific AI engines and models to individual Partners and Customers.
3. **Usage & Quota Limits**: Enforce configurable daily/monthly token limits per tenant and user tier.
4. **Fallback & Resiliency**: Automatically failover to backup model endpoints if a primary provider rate-limits or errors out.
5. **Streaming & Async**: Support Server-Sent Events (SSE) / streaming responses for interactive AI tools.
