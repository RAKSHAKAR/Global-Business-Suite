# Backend API Reference Documentation

The core backend for the platform is an Express.js REST API built with TypeScript in `apps/api`, running on port `4000`.

---

## 1. Architecture Overview

- **Runtime:** Node.js (v18+) with TypeScript.
- **Framework:** Express.js with Helmet security headers, CORS, and Express-Rate-Limit.
- **Interactive Documentation:** Integrated Swagger UI documentation mounted at `http://localhost:4000/api-docs`.
- **Request Correlation:** Global `X-Request-ID` header generation and propagation across all logs, audit records, and responses.
- **Response Standardization:** Unified JSON output envelopes (`{ success: true, data: ..., meta: { timestamp, requestId } }`) and standardized error handling.
- **Idempotency:** Request de-duplication engine supporting `X-Idempotency-Key` header for safe replay of mutating operations (`POST`, `PUT`).
- **Subsystem Health Diagnostics:** `/health` endpoint delivering real-time database, worker, AI engine, and memory diagnostics.

---

## 2. Authentication & IAM Endpoints (`/api/v1/auth`)

### 1. CAPTCHA Subsystem

- **`GET /api/v1/auth/captcha`**: Generates a server-side SVG image CAPTCHA distortion with token ID.
- **`GET /api/v1/auth/captcha/audio/:id`**: Streams binary PCM WAV audio of CAPTCHA characters for visually impaired accessibility.

### 2. Password & Registration Flow

- **`POST /api/v1/auth/register`**: Creates a user account with hashed password.
- **`POST /api/v1/auth/login`**: Authenticates user using email, password, and required CAPTCHA token/ID. Returns JWT session token.

### 3. Google SSO

- **`POST /api/v1/auth/google-login`**: Exposes Google OAuth2 token exchange with automated account provisioning.

### 4. Multi-Factor Authentication (MFA / 2FA)

- **`POST /api/v1/auth/mfa/setup`**: Generates TOTP Base32 secret, `otpauth://` URI, and 8 recovery codes.
- **`POST /api/v1/auth/mfa/verify`**: Validates initial passcode to enable 2FA on the user account.
- **`POST /api/v1/auth/mfa/validate`**: Validates 6-digit TOTP code during login verification step.

---

## 3. Core Feature Endpoints Index

### AI Engine & Providers

- **`GET /api/v1/ai-providers`**: List global AI LLM vendors (OpenAI, Gemini, Anthropic, Cursor).
- **`POST /api/v1/ai-providers`**: Add/update AI vendor global keys.
- **`GET /api/v1/tenant-ai`**: Manage tenant AI monthly quotas and custom key overrides.
- **`POST /api/v1/ai/generate`**: Send generation prompts to active AI engine.

### Roles & Access Control (RBAC)

- **`GET /api/v1/roles`**: List system and tenant roles with assigned permissions.
- **`POST /api/v1/roles`**: Create custom RBAC role with permission IDs.
- **`PUT /api/v1/roles/:id`**: Update permissions for a custom role.
- **`DELETE /api/v1/roles/:id`**: Delete a custom role.

### Audit Logging

- **`GET /api/v1/audit-logs`**: Search and filter platform audit logs.
- **`GET /api/v1/audit-logs/export`**: Download formatted `audit_logs.csv` export.

### Lead Capture & Integrations

- **`POST /api/v1/leads`**: Public lead capture form processing with mandatory CAPTCHA.
- **`GET /api/v1/leads`**: Fetch leads for Admin Portal with WhatsApp Video Call follow-up triggers.

### Google Business Profile & Reviews

- **`GET /api/v1/reviews`**: Fetch customer reviews filtered by location, rating, or sentiment.
- **`POST /api/v1/reviews/:id/reply`**: Publish reply back to Google Maps.

### GBP Suite (`/api/v1/gbp/*`)

- **`GET /api/v1/gbp/locations`**: List all GBP locations for the authenticated tenant.
- **`POST /api/v1/gbp/locations`**: Create a new GBP location record.
- **`GET /api/v1/gbp/locations/:id/reviews`**: Fetch reviews for a location.
- **`POST /api/v1/gbp/locations/:id/reviews/:reviewId/reply`**: Publish a review reply.
- **`POST /api/v1/gbp/locations/:id/reviews/:reviewId/ai-reply`**: Generate an AI reply suggestion.
- **`PUT /api/v1/gbp/locations/:id/reviews/bulk-reply`**: Bulk AI-reply across multiple reviews.
- **`GET|POST /api/v1/gbp/locations/:id/posts`**: List or create GBP posts (events, offers, updates).
- **`GET|POST /api/v1/gbp/locations/:id/products`**: Product catalog per location.
- **`GET|POST /api/v1/gbp/locations/:id/services`**: Service list per location.
- **`GET|POST /api/v1/gbp/locations/:id/media`**: Photo/video gallery.
- **`GET /api/v1/gbp/locations/:id/questions`**: Customer Q&A questions.
- **`POST /api/v1/gbp/locations/:id/questions/:qId/answer`**: Answer a Q&A question.
- **`GET /api/v1/gbp/locations/:id/messages`**: Customer messaging inbox.
- **`GET /api/v1/gbp/locations/:id/insights`**: GBP analytics (views, searches, actions).
- **`POST /api/v1/gbp/sync`**: Trigger a manual full GBP sync.
- **`GET /api/v1/gbp/multi-location/summary`**: Cross-location aggregate dashboard.

### Social Publisher (`/api/v1/social/*`)

- **`GET /api/v1/social/channels`**: List all OAuth-connected social channels for the tenant.
- **`POST /api/v1/social/channels`**: Manually connect a social channel (direct token input).
- **`DELETE /api/v1/social/channels/:id`**: Disconnect a channel.
- **`GET /api/v1/social/channels/oauth-url/:platform`**: Get the OAuth redirect URL for a platform.
- **`GET /api/v1/social/posts`**: List social posts (paginated, filterable by platform/status).
- **`POST /api/v1/social/posts`**: Create and schedule a social post to one or more platforms.
- **`PUT /api/v1/social/posts/:id`**: Update post content or schedule.
- **`DELETE /api/v1/social/posts/:id`**: Delete a post.
- **`POST /api/v1/social/posts/:id/publish`**: Publish a post immediately to all selected channels.
- **`GET /api/v1/social/posts/:id/results`**: Get per-channel publish results (externalId, URL, error).
- **`GET /api/v1/social/analytics`**: Cross-platform analytics rollup (reach, impressions, engagement).

**Supported Platforms:** `GOOGLE_BUSINESS`, `FACEBOOK`, `INSTAGRAM`, `LINKEDIN`, `PINTEREST`, `TIKTOK`, `THREADS`, `TWITTER_X`, `YOUTUBE`

### Automation Engine (`/api/v1/automation/*`)

- **`GET /api/v1/automation/rules`**: List all automation rules for the tenant.
- **`POST /api/v1/automation/rules`**: Create an automation rule (trigger → action).
- **`PUT /api/v1/automation/rules/:id`**: Update rule conditions or actions.
- **`DELETE /api/v1/automation/rules/:id`**: Delete a rule.
- **`PATCH /api/v1/automation/rules/:id/toggle`**: Enable or disable a rule.
- **`POST /api/v1/automation/rules/:id/test`**: Manually test a rule's execution.

### Admin — Social Channel Oversight (`/api/v1/admin/social-channels/*`)

*Requires super-admin authentication (Admin Portal only).*

- **`GET /api/v1/admin/social-channels`**: List all tenant social channel connections platform-wide.
- **`GET /api/v1/admin/social-channels/stats`**: Aggregated stats (total, active, expiring, expired, by platform).
- **`DELETE /api/v1/admin/social-channels/:id`**: Revoke any tenant's channel access (audit-logged).
- **`PATCH /api/v1/admin/social-channels/:id/deactivate`**: Soft-deactivate a channel without deleting it.

### Billing & Support

- **`GET /api/v1/billing/plans`**: List public subscription plans and allowed AI models.
- **`GET /api/v1/billing/subscription`**: Check tenant subscription status.
- **`GET /api/v1/support/tickets`**: List tenant support tickets.
- **`POST /api/v1/support/tickets`**: Open a new support ticket.

### Mobile App Releases

- **`GET /api/v1/releases`**: List mobile app release binaries and mandatory update flags.
- **`POST /api/v1/releases`**: Register a new Android/iOS build version.

### Phase 5 Partner Portal Suite (`/api/v1/partner/*`)

- **`GET /api/v1/partner/dashboard-layout`**: Get saved 16-widget dashboard layout for user.
- **`PUT /api/v1/partner/dashboard-layout`**: Save customized widget layout preset.
- **`GET /api/v1/partner/dashboard-metrics`**: Telemetry metrics (revenue, leads, posts, rating).
- **`GET /api/v1/partner/business-profile`**: Get company profile, working hours, and branch locations.
- **`PUT /api/v1/partner/business-profile`**: Update company profile settings.
- **`GET /api/v1/partner/team`**: List tenant team members and assigned roles.
- **`POST /api/v1/partner/team/invite`**: Issue team invitation token and role.
- **`POST /api/v1/partner/team/import`**: Bulk import team members via CSV array.
- **`GET /api/v1/partner/team/export`**: Export team directory as CSV data.
- **`GET /api/v1/partner/customers`**: Get CRM customer base.
- **`POST /api/v1/partner/customers`**: Create new client profile.
- **`GET /api/v1/partner/customers/:id/timeline`**: Customer activity interaction timeline.
- **`GET /api/v1/partner/gbp/extended`**: Get multi-location GBP sub-modules.
- **`POST /api/v1/partner/gbp/posts`**: Create and schedule GBP post.
- **`PUT /api/v1/partner/gbp/reviews/:id/reply`**: Reply to GBP customer review.
- **`GET /api/v1/partner/social/suite`**: Omnichannel social suite details.
- **`POST /api/v1/partner/social/schedule`**: Schedule multi-channel social post.
- **`POST /api/v1/partner/ai/generate`**: Execute specialized AI Studio tool prompt.
- **`GET /api/v1/partner/ai/history`**: AI prompt execution audit log.
- **`GET /api/v1/partner/marketing/campaigns`**: List omnichannel marketing campaigns.
- **`POST /api/v1/partner/marketing/campaigns`**: Launch Email, SMS, WhatsApp, or Push campaign.
- **`GET /api/v1/partner/crm/pipelines`**: Sales CRM deal pipeline board & stages.
- **`PUT /api/v1/partner/crm/opportunities/:id/stage`**: Transition deal stage in pipeline.
- **`GET /api/v1/partner/calendar-tasks`**: Get calendar events and team tasks.
- **`POST /api/v1/partner/calendar-tasks/events`**: Create calendar appointment.
- **`POST /api/v1/partner/calendar-tasks/tasks`**: Create task item.
- **`GET /api/v1/partner/files`**: Media asset vault storage files.
- **`POST /api/v1/partner/files/upload`**: Upload file asset to vault.
- **`GET /api/v1/partner/reports`**: 11-suite enterprise reports telemetry.
- **`GET/PUT /api/v1/partner/notifications/preferences`**: Delivery channel preferences.
- **`GET /api/v1/partner/subscription`**: Subscription plan, invoices, and billing add-ons.
- **`GET /api/v1/partner/global-search`**: Global `Ctrl+K` command palette search across 9 entities.
- **`GET /api/v1/partner/workflows`**: Automation rules and pending approval requests.

### Phase 6 Customer Portal Suite (`/api/v1/customer/*`)

- **`GET /api/v1/customer/dashboard-layout`**: Get saved 18-widget dashboard layout.
- **`PUT /api/v1/customer/dashboard-layout`**: Save customized widget layout.
- **`GET /api/v1/customer/dashboard-metrics`**: Telemetry metrics (services, orders, appointments, invoices).
- **`GET /api/v1/customer/profile`**: Get profile details, addresses, and connected devices.
- **`PUT /api/v1/customer/profile`**: Update customer details.
- **`GET /api/v1/customer/services`**: Subscribed services & add-on recommendations.
- **`POST /api/v1/customer/services/request`**: Submit upgrade, downgrade, or cancellation request.
- **`GET /api/v1/customer/orders`**: Order history & tracking status.
- **`POST /api/v1/customer/orders`**: Create customer order.
- **`GET /api/v1/customer/appointments`**: List booked appointments & meeting links.
- **`POST /api/v1/customer/appointments`**: Book virtual session appointment.
- **`GET /api/v1/customer/gbp`**: Google Business profile updates, FAQs, & reviews.
- **`POST /api/v1/customer/gbp/reviews`**: Submit customer star review.
- **`GET /api/v1/customer/messages`**: Omnichannel messaging log.
- **`POST /api/v1/customer/messages`**: Send message to Account Manager.
- **`GET /api/v1/customer/support`**: Support tickets & Knowledge Base articles.
- **`POST /api/v1/customer/support/tickets`**: Open support ticket.
- **`POST /api/v1/customer/ai/assistant`**: Execute specialized Customer AI engine (7 tools).
- **`GET /api/v1/customer/documents`**: Document vault files & contracts.
- **`POST /api/v1/customer/documents/upload`**: Upload file to document vault.
- **`GET /api/v1/customer/payments`**: Invoices, auto-pay methods, & receipts.
- **`POST /api/v1/customer/payments/pay`**: Pay unpaid invoice.
- **`GET /api/v1/customer/reports`**: 7-domain customer reports.
- **`GET/PUT /api/v1/customer/notifications/preferences`**: Notification preferences.
- **`GET /api/v1/customer/global-search`**: Command search (`Ctrl+K`) across 8 customer entities.
- **`GET /api/v1/customer/workflows`**: Automated customer workflows.

---

### Phase 7 Enterprise Mobile Applications API Suite (`/api/v1/mobile/*` & Mobile Headers)

- **Mobile Security Headers**:
  - `X-Cert-Pinning`: `verified` (Passed on all native requests for SSL certificate pinning).
  - `User-Agent`: `GBSMobile/1.0 (iOS|Android)`
- **Device & Push Notification Endpoints**:
  - **`POST /api/v1/auth/devices`**: Register native push notification token (`pushToken`), OS version, device name, and jailbreak status.
  - **`POST /api/v1/auth/biometrics/verify`**: Verify native Face ID / Fingerprint session token signature.
- **Offline Auto-Sync Endpoints**:
  - **`POST /api/v1/mobile/sync`**: Process batched offline queue actions (`OfflineSyncQueue`) with timestamp conflict resolution.
- **Partner Mobile Review Auto-Reply Endpoint**:
  - **`POST /api/v1/partner/reviews/auto-reply-all`**: Execute 1-Tap AI auto-replies across all pending location reviews.

---

### Phase 8 Enterprise Backend APIs & Microservices Suite (`/api/v1/search`, `/api/v1/notifications`, `/metrics`)

- **Global Multi-Entity Search**:
  - **`GET /api/v1/search?q=query&type=all|users|leads|reviews|posts`**: High-performance cross-domain search engine with pagination, relevance ranking, and tenant isolation.
- **Omnichannel Notifications Dispatch**:
  - **`POST /api/v1/notifications/send`**: Multi-channel notification delivery (Email, SMS, WhatsApp, Push, In-App) with background queue processing.
  - **`GET /api/v1/notifications/preferences`**: Fetch tenant/user channel delivery preferences.
- **Observability & Telemetry**:
  - **`GET /metrics`**: Real-time Prometheus/JSON metrics endpoint monitoring request throughput, error rates, route latency histograms, memory usage, and DB status.
  - **`GET /health`**: Enterprise subsystem health check reporting real-time database, worker queue, and AI engine status.
- **Decoupled Microservice Modules**:
  - `authServiceModule`, `aiEngineServiceModule`, `gbpServiceModule`, `notificationsServiceModule`, `billingServiceModule`, `reportingServiceModule`, `searchServiceModule`, `mediaServiceModule`, `crmServiceModule`.

---

### Phase 16 Enterprise Platform Services, Automation & Operations API Suite (`/api/v1/platform-services/*`)

- **Centralized Multi-Channel Notification Center**:
  - **`POST /api/v1/platform-services/notifications/send`**: Dispatch across 11 channels (EMAIL, SMS, WHATSAPP, PUSH, BROWSER, IN_APP, SLACK, TEAMS, TELEGRAM, DISCORD, WEBHOOK) with variable substitution and fallback cascading.
  - **`GET /api/v1/platform-services/notifications/logs`**: Audit delivery tracking logs across channels.
  - **`PATCH /api/v1/platform-services/notifications/:id/read`**: Mark notification as read.
- **Visual Drag & Drop Workflow Engine**:
  - **`POST /api/v1/platform-services/workflows/definitions`**: Save/update visual node graph definitions.
  - **`POST /api/v1/platform-services/workflows/execute`**: Execute workflow instance.
  - **`GET /api/v1/platform-services/workflows/executions`**: Audit real-time execution step history.
- **Automation Engine & Priority Queue**:
  - **`POST /api/v1/platform-services/automation/jobs`**: Enqueue job with priority (`CRITICAL`, `HIGH`, `DEFAULT`, `LOW`).
  - **`POST /api/v1/platform-services/automation/jobs/process`**: Trigger background queue batch execution.
  - **`POST /api/v1/platform-services/automation/jobs/retry-dlq`**: Bulk retry failed DLQ jobs.
- **Integration Platform & SSO Connectors**:
  - **`GET /api/v1/platform-services/integrations/connectors`**: List configured integration connectors.
  - **`POST /api/v1/platform-services/integrations/connectors`**: Register new SSO/OAuth/Webhook connector (Zapier, Make, Entra ID, etc.).
- **Feature Flags & Emergency Control**:
  - **`POST /api/v1/platform-services/feature-flags/evaluate-hierarchical`**: Evaluate multi-tier targeting rules.
  - **`POST /api/v1/platform-services/feature-flags/kill-switch`**: Activate emergency kill-switch.
- **System Monitoring & Security Ops**:
  - **`GET /api/v1/platform-services/monitoring/system-health`**: Full subsystem health telemetry & SLA metrics.
  - **`GET /api/v1/platform-services/security-ops/threats`**: Audit security threat detection logs.
  - **`POST /api/v1/platform-services/security-ops/log-threat`**: Log threat incident & trigger block hooks.
- **Backup, DR & Compliance**:
  - **`POST /api/v1/platform-services/backup-dr/trigger`**: Trigger automated encrypted backup.
  - **`POST /api/v1/platform-services/backup-dr/restore-test`**: Simulate automated restore test & PITR validation.
  - **`POST /api/v1/platform-services/compliance/gdpr/erasure`**: Execute GDPR Right to Erasure user data anonymization.
- **Global Search Platform v2**:
  - **`GET /api/v1/platform-services/search/global-v2?q=query`**: Full-text & AI entity search across platform entities.

