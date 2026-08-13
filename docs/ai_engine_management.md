# AI Engine Multi-Provider Architecture & Tenant Model Governance

This document describes the multi-provider LLM integration layer, global API key encryption, tenant model quota management, and prompt handling within the platform.

---

## 1. Overview

The platform includes a flexible, multi-provider AI Engine subsystem capable of routing AI requests (Poster generation, caption generation, email generation, marketing insights, and sentiment analysis) to multiple LLM vendors:

- **Google Gemini** (e.g. `gemini-1.5-pro`, `gemini-1.5-flash`)
- **OpenAI** (e.g. `gpt-4o`, `gpt-4o-mini`)
- **Anthropic** (e.g. `claude-3-5-sonnet`, `claude-3-haiku`)
- **Cursor AI / Custom Providers**

---

## 2. Core Features & Capabilities

1. **Global Provider Management**: Platform Super Admins can add, enable, disable, and configure global API keys for any AI provider via the Admin Portal (`/ai-providers`).
2. **Dynamic Model Catalog**: Each provider maintains a list of associated AI models (`AiModel`) with activity toggles.
3. **Tenant Quotas & Key Overrides**: Individual tenants can be assigned token/request quotas (`quotaMonthly`) or provide their own API key (`overrideKey`) in `TenantAiConfig`.
4. **Subscription Tier Entitlements**: Access to specific models (e.g., `gpt-4o` vs `gemini-1.5-flash`) is gated based on the tenant's active `Plan.allowedModels` JSON array.

---

## 3. Data Schema Models (`schema.prisma`)

### `AiProvider`

- `id`, `name` (e.g., `"Google Gemini"`), `providerKey` (e.g., `"gemini"`), `apiKey` (Global Key), `isActive`.

### `AiModel`

- `id`, `providerId`, `modelKey` (e.g., `"gpt-4o"`), `name`, `isActive`. Unique constraint: `[providerId, modelKey]`.

### `TenantAiConfig`

- `id`, `tenantId`, `providerId`, `isActive`, `quotaMonthly` (0 = unlimited), `usageCurrent`, `overrideKey`. Unique constraint: `[tenantId, providerId]`.

---

## 4. API Endpoints Specification

### Super Admin Provider APIs

- `GET /api/v1/ai-providers` — List all AI providers and their models.
- `POST /api/v1/ai-providers` — Register a new AI provider.
- `PUT /api/v1/ai-providers/:id` — Update API key or status of a provider.
- `POST /api/v1/ai-providers/:id/models` — Add an AI model to a provider.

### Tenant AI Governance APIs

- `GET /api/v1/tenant-ai` — List tenant AI configurations and usage.
- `POST /api/v1/tenant-ai` — Set monthly quota or bring-your-own-key override for a tenant.
- `POST /api/v1/ai/generate` — Main generation endpoint forwarding prompts to the authorized AI engine.

---

## 5. Security & Isolation

- **API Key Security**: API keys are securely stored in the database and never exposed to client-side bundles.
- **Tenant Isolation**: AI Content logs (`AiContent`) record the prompt, generated result, content type (`CAPTION`, `EMAIL`, `BLOG`), and `tenantId` for auditability.
