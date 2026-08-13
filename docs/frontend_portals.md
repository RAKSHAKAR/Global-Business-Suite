# Web Interfaces (Frontend Portals) Architecture

The Dhandha AI platform includes four primary web application portals designed for specific audiences.

---

## 1. Design Language & Branding

All web portals adhere to the unified **GBS Enterprise Design System** (`packages/gbs-design-system.css`).

- **Base Backgrounds:** Slate 50 (`#F8FAFC`) / Dark Slate (`#0F172A`).
- **Surface Backgrounds:** Pure White (`#FFFFFF`) / Surface Slate (`#1E293B`) or frosted glass (`backdrop-filter: blur(12px)`).
- **Typography:** Inter / System UI with Charcoal (`#111827`) primary text.
- **Accents:** Royal Blue (`#2563EB`) primary CTAs, Indigo (`#4F46E5`) AI features, Gold / Amber (`#F59E0B`) highlights.
- **Theme Gating:** Theme preference toggled via root `data-theme="light|dark"` attribute.

---

## 2. Portals Breakdown & Framework Distribution

### 1. Admin Web Portal (`apps/admin-portal`)

- **Port:** `3000`
- **Framework:** Next.js 14 (App Router) / React 18 / Tailwind CSS v3.4
- **Purpose:** Central control center for Super Admins.
- **Key Features:** Tenant management, AI provider key management (`/ai-providers`), security CAPTCHA settings (`/settings/security`), audit log viewer (`/audit-logs`), and marketing leads (`/leads`).

### 2. Partner Web Portal (`apps/partner-portal`)

- **Port:** `3001`
- **Framework:** Next.js 14 (App Router) / React 18 / Tailwind CSS v3.4
- **Purpose:** SaaS tenant & agency partner workspace.
- **Key Features:** Managing assigned clients, bulk scheduling social media content, review monitoring, billing oversight, and AI studio content generation.

### 3. Customer Web Portal (`apps/customer-portal`)

- **Port:** `3002`
- **Framework:** Next.js 16 (App Router) / React 19 / Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Purpose:** End-client business owner dashboard.
- **Key Features:** Real-time Marketing Score & Google Performance trackers, social post approval calendar, AI Poster & Caption generator.

### 4. Marketing Public Portal (`apps/web-portal`)

- **Port:** `3003`
- **Framework:** Next.js 16 (App Router) / React 19 / Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Purpose:** Public-facing platform marketing website and lead capture hub.
- **Key Features:** Product landing pages, feature comparisons, pricing tier calculator, and CAPTCHA-protected lead ingestion form.
