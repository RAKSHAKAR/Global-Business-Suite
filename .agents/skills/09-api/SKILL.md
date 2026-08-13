---
name: 09-api
description: GBS-AIOS Skill 09 - API Skill. Governs API Gateway routing, REST contracts, request validation, and response formatting.
---

# Skill 09 — API Skill (GBS-AIOS)

## Purpose
Governs REST API design, endpoint contracts, parameter validation, rate limiting, and OpenAPI/Swagger documentation.

## Responsibilities
• Maintain standard `/api/v1/<domain>` route structure in `apps/api/src/routes/`.
• Validate all incoming request bodies using Zod / Joi schema definitions.
• Standardize status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Rate Limited, 500 Internal Error).
• Update `docs/api_reference.md` whenever routes or payloads change.
