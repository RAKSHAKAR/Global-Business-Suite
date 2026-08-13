# Global Business Suite (GBS) — Application Architecture & Monorepo Structure

> **Brand:** Global Business Suite (GBS)  
> **Tagline:** _One Platform. Every Business. Unlimited Growth._

This repository is structured as a monorepo containing multiple applications within the `apps/` directory and shared packages within `packages/`, adhering strictly to the **GBS Enterprise Design System**.

---

## 1. Shared Packages (`packages/`)

### `packages/database`

- Centralized Prisma schema (`prisma/schema.prisma`), database seed scripts (`seed.ts`, `seed-ai-settings.ts`), migrations, and Prisma Client export (`@saas/database`).

### `packages/gbs-design-system.css`

- Master design tokens (`--gbs-*`), color palettes, glassmorphism utilities, dark/light theme definitions (`data-theme="light|dark"`), button classes (`.gbs-btn`), and card components (`.gbs-kpi-card`).

---

## 2. Core Backend Service (`apps/api`)

- **Port:** `4000` (`/api`) | Interactive Swagger Docs (`/api-docs`)
- **Role:** Central Backend API built with Express.js and TypeScript on Node.js.
- **Responsibilities:** Database ORM handling via Prisma, authentication & JWT sessions, CAPTCHA image/WAV generation, MFA TOTP engine, RBAC permission guards, audit logging, AI model prompt forwarding, Google Business Profile review sync, and subscription gating.

---

## 3. Administrative Applications

### `apps/admin-portal`

- **Port:** `3000` | Next.js 14 / React 18 / Tailwind v3.4
- **Role:** Web Command Center for Platform Owners (Super Admins).
- **Responsibilities:** Managing SaaS tenants, global AI engine settings (`/ai-providers`), platform security parameters (`/settings/security`), audit log viewer (`/audit-logs`), marketing leads (`/leads`), and subscription plans.

### `apps/admin-mobile`

- **Port:** `8081` (Expo Web) | React Native / Expo Go
- **Role:** Native Mobile Companion for Super Admins.
- **Responsibilities:** Real-time platform metrics, emergency tenant lockouts, and alert management.

---

## 4. Partner / Tenant Applications

### `apps/partner-portal`

- **Port:** `3001` | Next.js 14 / React 18 / Tailwind v3.4
- **Role:** Web Workspace for SaaS Agency Partners & Internal Account Managers.
- **Responsibilities:** Managing assigned clients, bulk scheduling social media content, review monitoring, billing oversight, and AI studio content generation.

### `apps/partner-mobile`

- **Port:** `8082` (Expo Web) | React Native / Expo Go
- **Role:** Mobile Suite for Agency Partners.
- **Responsibilities:** Fast client health metric tracking, post approvals on the go, and push notification alerts.

---

## 5. End-User (Customer) Applications

### `apps/customer-portal`

- **Port:** `3002` | Next.js 16 / React 19 / Tailwind v4
- **Role:** Client-Facing Business Owner Workspace.
- **Responsibilities:** Real-time Marketing Score KPI dashboard, Google Business review tracking, social calendar, AI Poster & Caption Generator.

### `apps/customer-mobile`

- **Port:** `8083` (Expo Web) | React Native / Expo Go
- **Role:** Mobile Companion for End-Clients.
- **Responsibilities:** Native mobile access for review notifications, post approval triggers, and score tracking.

---

## 6. Public Marketing Applications

### `apps/web-portal`

- **Port:** `3003` | Next.js 16 / React 19 / Tailwind v4
- **Role:** Public Marketing Landing Platform & Lead Capture Site.
- **Responsibilities:** Product landing pages, pricing calculator, interactive component showcases, and CAPTCHA-protected lead ingestion form.
