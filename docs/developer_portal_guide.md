# Global Business Suite (GBS) — Developer Portal Guide

## Overview

The GBS Developer Portal provides an enterprise-grade hub for developers, ISVs, and partners to build, test, and manage API integrations, OAuth 2.0 applications, webhooks, and custom plugins.

## Core Capabilities

1. **OAuth 2.0 & API Key Management**:
   - Register applications with scoped access (`read`, `write`, `crm`, `ai`, `gbp`, `billing`).
   - Standard, Enterprise, and Unlimited rate-limiting tiers.
   - Dual environment credentials (Sandbox vs Production).

2. **Webhook Subscriptions**:
   - Subscribe to real-time events (`user.created`, `lead.won`, `gbp.review_received`, `invoice.paid`).
   - HMAC SHA-256 signature headers for security.
   - Automated delivery retry queue with failure tracking.

3. **Interactive API Explorer & Swagger**:
   - Built-in OpenAPI 3.0 UI accessible at `/api-docs`.
   - Sandbox testing environment with mock data simulation.

4. **SDK Distribution**:
   - Pre-packaged official SDK distributions across 15+ environments:
     - JavaScript / TypeScript (`@gbs/sdk-js`)
     - Python (`gbs-sdk-python`)
     - React Native / Expo (`@gbs/sdk-react-native`)
     - Flutter (`gbs_flutter_sdk`)
     - Go (`github.com/gbs/sdk-go`)
     - Java / Spring (`com.gbs:gbs-sdk-java`)
     - .NET / C# (`Gbs.Sdk.DotNet`)
     - PHP / Laravel (`gbs/sdk-php`)

## Developer API Endpoints

- `GET /api/v1/ecosystem/developer/apps` — List registered OAuth apps
- `POST /api/v1/ecosystem/developer/apps` — Register a new application
- `GET /api/v1/ecosystem/developer/sdks` — Retrieve SDK package specs
