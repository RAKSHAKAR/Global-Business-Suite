# GBS Phase 4 – Enterprise Admin Portal Master Implementation Plan

## Proposed Architecture & Solution Overview

The **Global Business Suite (GBS) Phase 4 Framework** transforms the **Admin Portal** into the single enterprise control center for the entire platform.

It consolidates **dynamic dashboards**, **white-label branding**, **system settings centralization**, **AI engine governance**, **GBP & Social Media administration**, **billing & subscription management**, **CRM & lead pipeline oversight**, **notification templates**, **enterprise search**, **file storage management**, **mobile app release versioning**, and **automated testing**.

---

## User Review Required

> [!IMPORTANT]
> **Enterprise Admin Control Center Scope:**
> The Admin Portal governs all 4 Web Portals (`Admin`, `Partner`, `Customer`, `Web`), 3 Mobile Applications (`Admin`, `Partner`, `Customer`), and API services.
> - **Branding & White-Label**: Dynamic theme HSL colors, logos, favicons, typography, and email/mobile templates.
> - **System Settings**: Centralized API Keys, Auth Policies, Payment Gateways, Storage, CDN, and Feature Flags.
> - **AI Engine Governance**: Provider failover, model priority, prompt templates, and token cost tracking.
> - **Mobile App Oversight**: Version control, force update thresholds, and Maintenance Mode toggle.

> [!NOTE]
> **Enterprise Global Command Search:**
> Includes a global Command Palette (`Ctrl+K` / `Cmd+K`) searching across Users, Tenants, Leads, Audit Logs, AI Prompts, Invoices, and System Settings.

---

## Proposed Changes

### Component 1: Database Schema Extensions (`packages/database`)

#### [MODIFY] [schema.prisma](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/packages/database/prisma/schema.prisma)
- Add `WhiteLabelConfig` model (`logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`, `themeMode`, `customCss`, `appTitle`).
- Add `PromptTemplate` model (`key`, `title`, `systemPrompt`, `userPrompt`, `version`, `modelKey`).
- Add `NotificationTemplate` model (`key`, `channel`, `subject`, `body`, `isActive`).

---

### Component 2: Backend Administration APIs (`apps/api`)

#### [NEW] [adminCenterService.ts](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/api/src/services/adminCenterService.ts)
- Service aggregating platform telemetry, white-label branding, prompt versioning, notification templates, global search, and app version control.

#### [NEW] [adminCenter.ts](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/api/src/routes/v1/adminCenter.ts)
- Endpoints for:
  - `GET /api/v1/admin/dashboard-stats` (Metrics for Users, Tenants, Subscriptions, AI Usage, API Health, Queues)
  - `GET /api/v1/admin/white-label` & `PUT /api/v1/admin/white-label` (Branding management)
  - `GET /api/v1/admin/prompts` & `POST /api/v1/admin/prompts` (AI Prompt Template Versioning)
  - `GET /api/v1/admin/notification-templates` & `PUT /api/v1/admin/notification-templates` (Notification Templates)
  - `GET /api/v1/admin/global-search` (Unified search across platform entities)
  - `POST /api/v1/admin/mobile-maintenance` (Mobile App version control & maintenance mode)

---

### Component 3: Admin Portal UI Pages & Modules (`apps/admin-portal`)

#### [MODIFY] [page.tsx](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/page.tsx)
- Upgrade Main Dashboard with dynamic metric cards, system health indicators, AI engine status, queue monitoring, and quick action widgets.

#### [NEW] [branding/page.tsx](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/branding/page.tsx)
- Full White-Label & Custom Branding control panel (Logos, Color Picker, Custom CSS, Typography, Email/Mobile themes).

#### [NEW] [ai-prompts/page.tsx](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/ai-prompts/page.tsx)
- AI Prompt Template & Versioning Studio.

#### [NEW] [notifications/page.tsx](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/notifications/page.tsx)
- Notification Templates & Multi-Channel Delivery Control.

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/Sidebar.tsx)
- Update navigation items with links for White-Label Branding, AI Prompts, Notifications, and Command Search.

---

### Component 4: Automated Testing & Verification Suite (`apps/api`)

#### [NEW] [adminPortal.test.ts](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/api/src/adminPortal.test.ts)
- Integration test suite testing:
  1. System Dashboard Telemetry API
  2. White-Label Branding Upsert & Retrieval
  3. AI Prompt Template Versioning
  4. Global Command Search
  5. Mobile App Maintenance Control

---

### Component 5: Documentation Synchronization (`docs`)

#### [MODIFY] [overview.md](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/docs/overview.md)
#### [MODIFY] [admin_security_dashboards.md](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/docs/admin_security_dashboards.md)
#### [MODIFY] [api_reference.md](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/docs/api_reference.md)
- Update architecture guides with Phase 4 Admin Control Center specifications.
