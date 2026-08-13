# GBS Phase 8 Release Notes — Enterprise Backend APIs & Microservices

## Version 8.0.0 — Major Microservices & Observability Architectural Release

### Highlights

1. **Decoupled Microservices Architecture**:
   - Implemented 9 autonomous microservice domain modules under `apps/api/src/services/microservices/`:
     - `authServiceModule`: Authentication, session devices, TOTP MFA, CAPTCHA, and Google SSO.
     - `aiEngineServiceModule`: LLM provider routing, token quota enforcement, and generation retries.
     - `gbpServiceModule`: Multi-location GBP synchronization, reviews, and post management.
     - `notificationsServiceModule`: Omnichannel notification delivery (Email, SMS, WhatsApp, Push, In-App).
     - `billingServiceModule`: Subscription verification, usage metering, and payment gateway webhooks.
     - `reportingServiceModule`: Cross-tenant dashboard metrics aggregation and CSV streaming.
     - `searchServiceModule`: Multi-entity global search across users, leads, reviews, and posts.
     - `mediaServiceModule`: File storage upload security, MIME type validation, and vault management.
     - `crmServiceModule`: Lead pipelines, deal stage transitions, and client interaction timelines.

2. **Event-Driven Event Bus (`GBSEventBus`)**:
   - In-memory event bus (`apps/api/src/services/eventBus.ts`) for asynchronous publish-subscribe event management.
   - Channels: `auth:login`, `ai:generated`, `gbp:synced`, `social:published`, `notification:sent`, `media:uploaded`, `crm:lead_created`, `billing:payment`.

3. **Observability, Telemetry & Diagnostics**:
   - **Structured JSON Logger (`logger.ts`)**: Contextual logging with request correlation IDs (`X-Request-ID`), `tenantId`, `userId`, and stack trace protection.
   - **Metrics Middleware (`metrics.ts`)**: Real-time Prometheus/JSON metrics endpoint mounted at `GET /metrics` tracking request throughput, status codes, route latency histograms, memory usage, and DB status.
   - **Subsystem Health Check**: Enhanced `GET /health` with DB status, worker queue status, and response latency diagnostics.

4. **Resilience & Security Hardening**:
   - **Circuit Breakers & Exponential Backoff (`retryEngine.ts`)**: Resilient execution wrapper with 30-second circuit breaker cooldown for third-party integrations.
   - **Request Payload Validation (`validation.ts`)**: Zod request schema validator middleware.
   - **Security Utils (`securityUtils.ts`)**: SSRF URL validation (blocking loopback, private ranges, cloud metadata APIs `169.254.169.254`) and file upload extension/MIME sanitization.

5. **New API Endpoints & Background Workers**:
   - **Global Search API**: `GET /api/v1/search?q=query&type=all|users|leads|reviews|posts`
   - **Notifications Dispatch API**: `POST /api/v1/notifications/send` and `GET /api/v1/notifications/preferences`
   - **Background Worker & DLQ Processor**: `apps/api/src/workers/backgroundProcessor.ts` handling queued background tasks, automatic retry cycles, dead-letter queues (DLQ), and cron scheduled tasks.

---

### Verification & Compliance

- **Automated Test Suites**:
  - `microservices.test.ts`: Passed.
  - `globalSearch.test.ts`: Passed.
  - `notifications.test.ts`: Passed.
  - `backgroundProcessor.test.ts`: Passed.
  - `securityValidation.test.ts`: Passed.
- **Backward Compatibility**: Fully backward compatible with legacy `/api/` endpoints and all 4 portals + 3 mobile apps.
