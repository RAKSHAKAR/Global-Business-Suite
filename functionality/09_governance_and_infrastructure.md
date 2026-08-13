# 09. Governance, Security & Infrastructure Documentation

The **Governance, Security & Infrastructure** module manages platform-wide health monitoring, API security, feature flags, audit logging, CAPTCHA defense, mobile app release binaries, and white-label theme customization.

---

## 📄 Page 1: Platform Control Center (`/platform-control`)

### Overview & Purpose
High-level operational control center for managing microservice health, database connections, Redis queue status, and system maintenance modes.

### Key Features & Functionality
1. **Service Telemetry**: Monitor Docker container health, Express API gateway uptime, memory usage, and background worker queues.
2. **Maintenance Mode Toggle**: Put specific portals or API endpoints into maintenance mode with custom user messages.
3. **Cache Purge & Flush**: Flush Redis caches or clear CDN edge caches globally.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/platform-control/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/platform-control/page.tsx)
- **API Endpoint**: `GET /api/v1/admin/platform-control/status`

---

## 📄 Page 2: White-Label Branding (`/branding`)

### Overview & Purpose
Global theme and branding customizer for setting logos, favicons, primary CSS colors, and custom email footer templates across portals.

### Key Features & Functionality
1. **Logo & Favicon Asset Uploader**: Upload Light Mode and Dark Mode logos.
2. **Design System Token Editor**: Customize CSS variables (`--primary`, `--accent`, `--bg-dark`, `--font-family`).
3. **Custom Domain SSL Status**: Verify SSL certificate status for tenant custom domains.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/branding/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/branding/page.tsx)

---

## 📄 Page 3: API Keys & Webhooks (`/api-integrations`)

### Overview & Purpose
Management console for developer API keys, secret generation, and outgoing webhook subscription URLs.

### Key Features & Functionality
1. **API Key Provisioning**: Generate `live` and `test` API secret keys with customizable expiration and scope restrictions.
2. **Webhook Subscriptions**: Subscribe external endpoints to events (e.g., `user.created`, `tenant.updated`, `review.received`).
3. **Delivery Logs & Payload Retries**: Re-send failed webhook deliveries.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/api-integrations/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/api-integrations/page.tsx)
- **API Endpoints**: `GET /api/v1/api-keys`, `GET /api/v1/webhooks`

---

## 📄 Page 4: Audit Logs (`/audit-logs`)

### Overview & Purpose
Immutable audit log directory recording all administrative and security actions across the platform for compliance.

### Key Features & Functionality
1. **Log Directory**: Filterable by Actor, Action (e.g., `CREATE_USER`, `DELETE_TENANT`), IP Address, and Timestamp.
2. **JSON Payload Inspector**: View full before/after state diffs for mutated records.
3. **Log Export**: Export audit logs to CSV or SIEM integrations (Datadog/Splunk).

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/audit-logs/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/audit-logs/page.tsx)
- **API Endpoint**: `GET /api/v1/audit-logs`

---

## 📄 Page 5: Feature Flags (`/feature-flags`)

### Overview & Purpose
Dynamic feature flag management enabling percentage rollouts, tenant targeting, and instant kill switches.

### Key Features & Functionality
1. **Feature Toggles**: Enable/disable experimental features without code redeployment.
2. **Targeting Rules**: Target specific tenants or user roles (e.g., enable v19 Customer Engagement only for Beta Tenants).
3. **Percentage Rollouts**: Roll out features incrementally to 10%, 50%, or 100% of user traffic.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/feature-flags/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/feature-flags/page.tsx)
- **API Endpoint**: `GET /api/v1/feature-flags`

---

## 📄 Page 6: Security & CAPTCHA (`/settings/security`) & App Releases (`/downloads`)

### Overview & Purpose
Defines enterprise security policies, CAPTCHA configurations (Google reCAPTCHA / Turnstile), and mobile app release links.

### Key Features & Functionality
1. **Security & CAPTCHA Controls**: Enable CAPTCHA protection on Login, Password Reset, and User Registration forms.
2. **App Releases Directory**: Download compiled Android APKs and iOS IPA builds for Admin, Partner, and Customer mobile apps.
3. **General System Settings (`/settings`)**: Configure platform name, support email, SMTP server settings, and system timezone.

### How It Works (Technical Details)
- **Frontend Pages**: [`apps/admin-portal/app/settings/security/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/settings/security/page.tsx), [`apps/admin-portal/app/downloads/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/downloads/page.tsx), [`apps/admin-portal/app/settings/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/settings/page.tsx)
