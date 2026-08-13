# Super Admin Security & Control Dashboards Technical Documentation

This document describes the design, features, and UI user workflows for the **Super Admin Security & Management Suite** in `apps/admin-portal`.

---

## 1. Overview

The Super Admin Security suite provides platform visibility and real-time control over bot protection, authentication security parameters, role-based access control, AI vendor configuration, marketing leads, and audit logging.

Key Security Dashboards in Admin Portal:

1. **Platform Security & CAPTCHA Panel (`/settings/security`)**
2. **Centralized Audit Log Viewer (`/audit-logs`)**
3. **AI Engine Provider Governance (`/ai-providers`)**
4. **Marketing Leads & WhatsApp Follow-Up (`/leads`)**

---

## 2. Platform Security & CAPTCHA Dashboard (`/settings/security`)

### Features

- **Global Toggle**: Enable or disable mandatory CAPTCHA protection platform-wide.
- **Distortion & Rendering Controls**: Select between `Low`, `Medium`, and `High` wave distortion levels and adjust noise density (0-10).
- **Character Preset Bounds**: Set minimum and maximum CAPTCHA character lengths (default 6).
- **Accessibility Audio Control**: Enable or disable the PCM WAV sound synthesis stream for visually impaired accessibility.
- **Lockout & Session Policies**: Configure maximum allowed failed attempts (default 5) and temporary lockout duration in minutes (default 15).

---

## 3. Centralized Audit Log Viewer (`/audit-logs`)

### Features

- **Real-Time Event Table**: View all authentication events (`USER_LOGIN`, `GOOGLE_SSO`), configuration modifications, and API access events.
- **Dynamic Action Filtering**: Filter log events by action name in real-time.
- **One-Click CSV Export**: Downloads platform audit logs as a formatted `audit_logs.csv` spreadsheet for compliance reporting.
- **Pagination**: Paginated rendering for performance with large volumes of log data.

---

## 4. AI Engine Provider Governance (`/ai-providers`)

### Features

- Manage global API keys for Google Gemini, OpenAI, Anthropic, and Cursor AI.
- Enable or disable individual AI models (`gpt-4o`, `claude-3-5-sonnet`, `gemini-1.5-pro`).
- Assign tenant quotas and manage custom bring-your-own-key overrides.
