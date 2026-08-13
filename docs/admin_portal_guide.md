# Global Business Suite (GBS) — Phase 4: Enterprise Admin Portal Guide

## Overview

The GBS Admin Portal serves as the single enterprise control center for the entire Global Business Suite platform. It provides centralized telemetry, governance, identity management, multi-tenant isolation, AI engine routing, Google Business Profile automation, multi-platform social media control, subscription billing, CRM sales pipelines, API gateway management, and system security controls.

For detailed page-by-page, module-by-module documentation of all functions and technical mechanics, see the [`functionality/`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/functionality/README.md) directory.

---

## Key Modules & Capabilities

### 1. Configurable 20-Widget Dashboard
- Real-time telemetry monitoring for Active Users, Monthly Recurring Revenue (MRR), AI Token Consumption, Google Business Status, API SLA, Queue Health, and Security Alerts.
- Supports drag-and-drop customization, widget drawer toggle, role-based dashboards, and PDF/CSV export.

### 2. User & Organization Hierarchy
- Multi-tier corporate structure: **Organizations → Branches → Departments → Teams & User Groups**.
- Full user lifecycle: Create, Edit, Suspend, Activate, Delete, Restore, Invite, and CSV Bulk Import/Export.

### 3. Role & Permission Simulator
- Role matrix cloning with permission inheritance.
- Interactive RBAC evaluation simulator to test target user access against resources (`users`, `tenants`, `billing`, `ai`, `settings`) and actions (`read`, `create`, `update`, `delete`, `manage`).

### 4. Tenant Administration & White-Labeling
- Single control center to customize enterprise branding: App Titles, Logos, Favicons, Primary/Secondary HSL color palettes, Custom CSS, and domain bindings.

### 5. Google Business Profile & Social Media Studio
- Multi-location Google Maps management, automated AI review replies, product catalogs, and update posts.
- Multi-channel scheduler across Facebook, Instagram, LinkedIn, X (Twitter), Threads, YouTube, TikTok, and Pinterest.

### 6. Subscriptions, Billing & CRM
- Plan management, pricing tiers, discount coupon generator (Percentage & Fixed Amount), usage add-ons.
- Multi-stage Kanban sales pipeline for tracking deal opportunities, contact notes, and activity logs.

### 7. Automation Workflow Builder & Integrations Gateway
- Rule builder for event triggers (`REVIEW_CREATED`, `NEW_LEAD`, `SCORE_DROP`) and automated actions (`REPLY_REVIEW_AI`, `POST_TO_SOCIAL`, `WEBHOOK`).
- Developer API Keys manager with rate limiting and secret-signed event webhooks.

### 8. System Security & Audit Logging
- Immutable audit log recorder tracking all administrative actions with IP addresses and user agents.
- CAPTCHA verification, MFA enforcement, and active threat monitoring.

---

## API Endpoints Reference

| Endpoint Route | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/admin/dashboard/widgets` | `GET` | Fetches data for all 20 dashboard widgets |
| `/api/v1/admin/org/tree` | `GET` | Returns multi-tier organization tree structure |
| `/api/v1/admin/roles-sim/simulate` | `POST` | Simulates user permission against resource & action |
| `/api/v1/admin/crm/pipelines` | `GET` | Fetches CRM pipelines, stages, and opportunities |
| `/api/v1/admin/billing-engine/overview` | `GET` | Returns billing revenue summary and coupons |
| `/api/v1/admin/integrations/api-keys` | `GET` / `POST` | Lists and generates developer API keys |
| `/api/v1/admin/storage/backups` | `GET` / `POST` | Manages system snapshot backups and logs |

---

## Final Validation Checklist

- [x] Admin Portal controls every platform module
- [x] No duplicate functionality
- [x] RBAC & Multi-tenant boundary enforced everywhere
- [x] Responsive layout on Desktop and Tablet
- [x] Mobile app versioning & feature flags integrated
- [x] Automated test suites passed (100% success rate)
- [x] Zero High or Critical security issues remaining
