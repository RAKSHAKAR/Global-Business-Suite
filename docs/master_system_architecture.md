# Global Business Suite (GBS) — Master System Architecture & Enterprise Reference

Version: 1.0 Enterprise Edition  
Platform: Monorepo Node.js / Next.js / Express / Prisma / Expo  
Architecture: Multi-Tenant Hybrid SaaS & AI Copilot Suite

---

## 1. Executive Monorepo Overview

The **Global Business Suite (GBS)** is a unified 8-application enterprise monorepo comprising:

```
                               ┌─────────────────────────────────────────────────────────┐
                               │             8 Monorepo Applications                     │
                               ├─────────────────────────────────────────────────────────┤
                               │ Web Portals (Next.js App Router):                       │
                               │ - Admin Portal (Port 3000 / apps/admin-portal)         │
                               │ - Partner Portal (Port 3001 / apps/partner-portal)     │
                               │ - Customer Portal (Port 3002 / apps/customer-portal)   │
                               │ - Marketing Web Portal (Port 3003 / apps/web-portal)    │
                               │                                                         │
                               │ Mobile Ecosystem (Expo / React Native):                 │
                               │ - Admin Mobile (Port 8081 / apps/admin-mobile)         │
                               │ - Partner Mobile (Port 8082 / apps/partner-mobile)     │
                               │ - Customer Mobile (Port 8083 / apps/customer-mobile)   │
                               │                                                         │
                               │ Enterprise Backend API:                                 │
                               │ - Express/TypeScript API Gateway (Port 4000 / apps/api) │
                               └────────────────────────────┬────────────────────────────┘
                                                            │
                                                            ▼
                               ┌─────────────────────────────────────────────────────────┐
                               │           Shared Data & Core Services Package           │
                               │  (@saas/database / packages/database/prisma)           │
                               │  - 30 Core Data Models                                  │
                               │  - Single-source Prisma Schema & ORM Transactions       │
                               └─────────────────────────────────────────────────────────┘
```

---

## 2. Platform Portals Breakdown & Enterprise Modules

### A. Admin Portal (`apps/admin-portal`)
- **Dashboard**: Real-time KPI counters (tenants, global users, system health, active subscriptions).
- **Tenant Management**: Multi-tenant provisioning, domain binding, white-label CSS branding.
- **Lead Pipeline**: Automated marketing lead capture with CAPTCHA verification & WhatsApp call triggers.
- **Global User & RBAC Governance**: Role definition, atomic permission matrices, Super Admin bypass.
- **Platform Security**: Server-side SVG/WAV CAPTCHA, RFC 6238 MFA TOTP verification, audit log CSV export.
- **AI Engine Management**: Vendor key registry (Gemini, OpenAI, Anthropic, Cursor) & tenant monthly quota control.
- **App Release Registry**: Android APK / iOS IPA version tracking with mandatory update flags.

### B. Partner Portal (`apps/partner-portal`) & Partner Mobile (`apps/partner-mobile`)
- **Configurable Workspace Dashboard**: 16 drag-and-drop widgets, saved layout presets, role-based dashboards, CSV export.
- **Business Profile & Multi-Branch**: Company information, branch office network, operating hours calendar, and document vault.
- **Team Management**: User roles, atomic permission scoping, member activation/suspension, and bulk CSV import/export.
- **Customer CRM & Pipeline**: Full client contact records, lead capture, tags, customer groups, deal Kanban board, and activity interaction timeline.
- **Google Business Profile (14+ Subsystems)**: Multi-location sync, verification status, GBP posts, AI review reply generator, product catalog, services list, media gallery, Q&A manager, insights analytics, and customer messaging.
- **Omnichannel Social Media Suite**: 8 platform integration (FB, IG, LinkedIn, X, Threads, YT, TikTok, Pinterest), multi-channel scheduling, AI generator, campaign calendar, and analytics.
- **AI Assistant Studio**: 8 specialized AI tool engines (Content, Image, Marketing, Advisor, SEO, Review, Campaign, Analytics), prompt template library, and generation audit logs.
- **Omnichannel Marketing & Workflows**: Email, SMS, WhatsApp, and Push campaigns, audience segmentation, automation rules, and approval workflows.
- **Operations & Asset Storage**: Interactive team calendar, meetings, task boards, reminders, and cloud file storage manager.
- **Enterprise Reports & Global Search**: 11 domain report suites with PDF/CSV export, scheduled reports, and global `Ctrl+K` command palette search.

### C. Customer Portal (`apps/customer-portal`) & Customer Mobile (`apps/customer-mobile`)
- **Configurable Workspace Dashboard**: 18 drag-and-drop widgets, saved layout presets, real-time telemetry, and CSV export.
- **Account & Security Governance**: Profile details, multi-address management, MFA TOTP setup, connected devices, and login history.
- **Subscribed Services Management**: Purchased services, renewal dates, auto-pay settings, upgrade/downgrade requests, and add-on recommendations.
- **Order & Payment Subsystem**: Order tracking, invoices, online payments, receipts, auto-pay methods, and refund requests.
- **Appointment Booking**: Availability lookup, virtual session booking, rescheduling, cancellation, and meeting video link integration.
- **Google Business Profile Integration**: Customer review submission, photo uploads, business updates, product/service browsing, and AI response previews.
- **Omnichannel Communication Hub**: Live Chat, Email, SMS, WhatsApp, and Push messaging with dedicated Account Managers.
- **Support Center & Knowledge Base**: Support ticket tracking, live chat, knowledge base search, and FAQ lookup.
- **Specialized Customer AI Studio**: 7 customer AI tool engines (Help, Knowledge, FAQ, Document, Recommendation, Appointment, Support) with AI voice & text command runners.
- **Document Vault**: Storage for contracts, agreements, invoices, receipts, reports, and customer uploads.
- **Customer Reports & Global Search**: 7 report domains with PDF/CSV export, and global `Ctrl+K` command palette search across 8 resource types.

### D. Marketing Public Portal (`apps/web-portal`)
- **Public Lead Ingestion**: High-converting lead form protected by server-side CAPTCHA.
- **Plan Pricing**: Dynamic subscription tier display directly powered by backend `/api/v1/billing/plans`.

---

## 3. Backend REST API Specifications (`apps/api`)

- **Port**: `4000` | **Documentation**: `http://localhost:4000/api-docs` (Swagger UI)
- **Security**: `helmet()`, CORS origin control, `express-rate-limit` (200 req / 15 min).
- **Core Endpoints**:

| Route Category | Base Path | Key Features |
|---|---|---|
| **Authentication** | `/api/v1/auth` | Login, Register, Mobile SMS/WhatsApp/Email OTP, Google/Apple/Microsoft/GitHub SSO, Passkeys WebAuthn |
| **Google Integration** | `/api/v1/google` | OAuth callback, `/detect-profiles` (Auto-detect GBP, orgs, accounts, locations), `/select-profiles` |
| **GBP & Access Control** | `/api/v1/gbp` | Multi-location sync, `/access-control`, `/bulk-approve`, `/bulk-revoke` |
| **Business Directory** | `/api/v1/business-directory` | 17 Directory adapters (Google, Apple, Bing, Meta, LinkedIn, Yelp, Foursquare, Tripadvisor, Trustpilot, Yellow Pages, BBB, Nextdoor, Baidu, Yandex, TomTom, HERE, OpenStreetMap) |
| **WhatsApp Marketing** | `/api/v1/whatsapp-marketing` | Cloud API, campaigns, A/B testing, audience segmentation, analytics, consent management |
| **Communication Center**| `/api/v1/communication-center` | Omnichannel dispatch (Email, SMS, WhatsApp, Push, Browser, Telegram, Slack, Teams, In-App Chat) |
| **Unified Business Manager**| `/api/v1/unified-business-manager`| Single dashboard view, AI WhatsApp/Review auto-replies, AI lead qualification, Business Health Score |
| **Partner Portal Control** | `/api/v1/partner` | Customer profile approve/reject/transfer/suspend, activity logs, audit history |
| **Admin Control Center** | `/api/v1/admin` | Dashboard telemetry, branding, OTP policies, SMS/WhatsApp provider configs, Subscription limit overrides |
| **Analytics BI** | `/api/v1/analytics` | `GET /dashboard` (Real-time DB metrics & AI Strategic Insights) |
| **GBP & Reviews** | `/api/v1/reviews` | `GET /` (Fetch), `POST /:id/reply` (Reply), `POST /:id/generate-ai-reply` (AI Reply), `GET /sentiment-summary` |
| **AI Providers** | `/api/v1/ai-providers` | Manage LLM vendor API keys & global activation |
| **Tenant AI** | `/api/v1/tenant-ai` | Monthly token quota allocations & custom model gating |
| **AI Generation** | `/api/v1/ai` | `POST /generate` with subscription plan model validation |
| **Lead Capture** | `/api/v1/leads` | Public lead ingestion with mandatory CAPTCHA validation |
| **Audit Logs** | `/api/v1/audit-logs` | Filterable security event log & CSV export download |
| **Billing** | `/api/v1/billing` | Subscription plan listing, invoice tracking |
| **Support** | `/api/v1/support` | Ticket creation and thread updates |
| **Releases** | `/api/v1/releases` | Mobile app binary distribution metadata |

---

## 4. Prisma Database Layer (`packages/database`)

The platform uses a single PostgreSQL/SQLite schema with **30 core data models**:

1. **Tenant Governance**: `Tenant`
2. **Identity & Auth**: `User`, `Session`, `ProviderAccount`, `MfaSecret`
3. **RBAC**: `Role`, `Permission`, `RolePermission`, `UserRole`
4. **CRM & Social**: `Client`, `SocialPost`, `AiContent`
5. **AI Engine Config**: `PlatformSetting`, `AiProvider`, `AiModel`, `TenantAiConfig`
6. **Billing**: `Plan`, `Subscription`, `Invoice`, `Payment`
7. **Support**: `Ticket`, `TicketMessage`, `KnowledgeBase`
8. **Security Audit**: `AuditLog`, `SystemLog`, `LoginHistory`
9. **Mobile Ecosystem**: `AppRelease`, `Device`
10. **Google Business Profile**: `Location`, `Review`

---

## 5. Mobile Ecosystem (`apps/*-mobile`)

- **Admin Mobile** (`apps/admin-mobile`): System health, tenant alerts, user lockouts.
- **Partner Mobile** (`apps/partner-mobile`): Mobile CRM, instant review replies, AI post generation.
- **Customer Mobile** (`apps/customer-mobile`): Quick score view, review notifications, AI poster generator.

---

## 6. Enterprise AI Engine & Multi-LLM Orchestration (Phase 12 Platform)

- **Multi-Provider AI Router**: 16+ provider adapters (OpenAI, Gemini, Anthropic, Azure, Vertex, Bedrock, Grok, DeepSeek, Mistral, Cohere, Perplexity, OpenRouter, Ollama, LM Studio, HuggingFace, Custom) with priority failover ranking.
- **Enterprise AI Agents Framework**: 16 domain agents (Marketing, SEO, CRM, Sales, Support, GBP, Social, Analytics, Billing, Review, Knowledge, Workflow, Admin/Partner/Customer/Developer Assistants).
- **RAG Vector Search Engine**: Multi-tenant document chunking, 64-dimensional normalized vector embeddings, and hybrid cosine similarity search.
- **Prompt Management Store**: Library with variable interpolation (`{{variable}}`), categories, versioning, and approval workflows.
- **AI Workflows Automation Engine**: Event-driven (`review:created`, `lead:captured`), cron-scheduled, and multi-step pipeline automation with `AiWorkflowRun` tracking.
- **AI Governance & Safety Engine**: Automatic PII masking (SSN, credit card, phone, email), prompt safety audit, tenant RPM/TPM rate limits, and monthly USD budget caps.
- **AI Analytics & Cost Intelligence**: Real-time token usage, per-request USD cost tracking, latency metrics, and provider/model usage aggregation.

---

## 8. Enterprise Microservices & Observability Platform (Phase 8 & 12)

- **Event Bus (`GBSEventBus`)**: In-memory decoupled event emitter allowing asynchronous side-effects across microservices modules without blocking HTTP event loops.
- **Decoupled Service Modules**: Autonomous domain modules (`authServiceModule`, `aiEngineServiceModule`, `gbpServiceModule`, `notificationsServiceModule`, `billingServiceModule`, `reportingServiceModule`, `searchServiceModule`, `mediaServiceModule`, `crmServiceModule`) ready for standalone containerization or unified API Gateway operation.
- **Observability & Metrics**: Structured JSON logging (`logger.ts`) with request correlation IDs (`X-Request-ID`), Prometheus `/metrics` telemetry, and `/health` subsystem diagnostics.
- **Resilience Engine (`retryEngine.ts`)**: Exponential backoff retries with jitter and circuit breaker pattern preventing cascading failures to third-party APIs.
- **Background Worker Processing**: Async job queue processor (`backgroundProcessor.ts`) handling queued jobs, retry cycles, dead-letter queues (DLQ), and cron scheduled tasks.

---

## 9. Production Release Readiness Checklist

- [x] All skills installed under `.agents/skills/`
- [x] All 8 applications compile without TypeScript errors
- [x] All documentation files in `docs/` fully updated
- [x] Security features (CAPTCHA, MFA, RBAC, Tenant Isolation, SSRF & File Upload Security) verified
- [x] Analytics BI Engine returns real-time dynamic DB metrics
- [x] Google Business Profile review reply generator functional
- [x] Phase 8 Microservices, EventBus, Telemetry Metrics, and Global Search fully operational
- [x] Phase 12 Enterprise AI Platform, 16 Providers, 16 Agents, RAG Vector Search, AI Workflows, Governance, and Automated Test Suite operational

