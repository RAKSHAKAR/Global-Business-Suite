# Enterprise Billing, Subscriptions & Support Ticketing Architecture

This document describes the subscription plan tiering, feature gating, invoice management, payment handling, and support ticketing system.

---

## 1. Overview

The platform supports end-to-end commercial operations for multi-tenant SaaS:

- Flexible Subscription Plans (`Plan`) with monthly/yearly billing intervals.
- Feature Entitlements Gating (`allowedModels` and feature flags).
- Automated Invoicing (`Invoice`) & Payment Gateways (`Payment`).
- Enterprise Support Ticketing (`Ticket`, `TicketMessage`) & Knowledge Base (`KnowledgeBase`).

---

## 2. Subscription & Feature Gating (`schema.prisma`)

### Data Models

- **`Plan`**: Defines subscription tiers (e.g. Starter, Growth, Enterprise), price, interval (`MONTHLY`, `YEARLY`), currency (`USD`, `INR`), and `allowedModels` (JSON array of permitted LLMs / features).
- **`Subscription`**: Connects a `Tenant` to a `Plan`, tracking `status` (`ACTIVE`, `CANCELED`, `PAST_DUE`), and billing cycle dates (`currentPeriodStart`, `currentPeriodEnd`).
- **`Invoice`**: Tracks billing amounts, due dates, status (`OPEN`, `PAID`, `VOID`), and line items for tenant accounts.
- **`Payment`**: Records transaction payment attempts via Stripe, PayPal, or Bank Transfer.

### Feature Gating Middleware

The backend enforces plan permissions using `requirePlanFeature(featureKey)`:

- Reads the user's `tenantId` from JWT.
- Checks active `Subscription` and corresponding `Plan.allowedModels`.
- Rejects unauthorized access with a `403 Forbidden` upgrade payload.

---

## 3. Support Ticketing & Knowledge Base Subsystem

### Data Models

- **`Ticket`**: Support requests raised by partners/tenants. Tracks `subject`, `status` (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), and `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **`TicketMessage`**: Threaded conversation history between users and platform support admins, including support for internal notes (`isInternal: true`).
- **`KnowledgeBase`**: Self-service documentation articles categorized for quick user resolution and AI semantic search integration.

---

## 4. API Specification

### Billing & Subscription APIs (`/api/v1/billing`)

- `GET /api/v1/billing/plans` — List all public subscription plans.
- `GET /api/v1/billing/subscription` — View current tenant subscription status and entitlements.
- `POST /api/v1/billing/subscribe` — Initiate or upgrade subscription plan.
- `GET /api/v1/billing/invoices` — Fetch tenant invoice history.

### Support APIs (`/api/v1/support`)

- `GET /api/v1/support/tickets` — List tenant support tickets.
- `POST /api/v1/support/tickets` — Create a new support ticket.
- `POST /api/v1/support/tickets/:id/messages` — Add reply message to ticket thread.
- `GET /api/v1/support/kb` — Query knowledge base articles.
