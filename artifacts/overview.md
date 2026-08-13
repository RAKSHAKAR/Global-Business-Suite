# Dhandha AI Enterprise - System Architecture Overview

## Introduction

**Dhandha AI Enterprise** (Global Business Suite / GBS) is a comprehensive, white-labeled multi-tenant social media management, marketing automation, and AI copilot platform. The platform enables enterprise agency partners and local business tenants to automate social content creation, monitor Google Business Profile reviews, analyze marketing scores, manage customer leads, and govern LLM AI models across portals and native mobile applications.

## Monorepo Architecture

The repository uses a modern **Monorepo** structure powered by `pnpm` workspaces and **Turborepo** (`turbo.json`).

### Port & Application Matrix

| Application Name         | Directory              | Platform / Framework                  | Dev Port | Key Role                                             |
| :----------------------- | :--------------------- | :------------------------------------ | :------- | :--------------------------------------------------- |
| **Admin Web Portal**     | `apps/admin-portal`    | Next.js 14 / React 18 / Tailwind v3.4 | `3000`   | Super Admin platform control center & settings       |
| **Partner Web Portal**   | `apps/partner-portal`  | Next.js 14 / React 18 / Tailwind v3.4 | `3001`   | SaaS tenant / agency partner management workspace    |
| **Customer Web Portal**  | `apps/customer-portal` | Next.js 16 / React 19 / Tailwind v4   | `3002`   | End-client business dashboard & AI content generator |
| **Marketing Web Portal** | `apps/web-portal`      | Next.js 16 / React 19 / Tailwind v4   | `3003`   | Public marketing site, landing pages & lead capture  |
| **Backend API**          | `apps/api`             | Express.js / TypeScript / Node.js     | `4000`   | Central REST API, IAM, CAPTCHA, RBAC & AI Engine     |
| **Admin Mobile App**     | `apps/admin-mobile`    | React Native / Expo Go / Expo Web     | `8081`   | Super admin mobile management suite                  |
| **Partner Mobile App**   | `apps/partner-mobile`  | React Native / Expo Go / Expo Web     | `8082`   | Agency partner mobile management suite               |
| **Customer Mobile App**  | `apps/customer-mobile` | React Native / Expo Go / Expo Web     | `8083`   | End-client native mobile companion app               |

### Shared Monorepo Packages

- **Database (`packages/database`)**: Contains `schema.prisma` (SQLite dev database, 33 models), seeds, migrations, and exported Prisma Client (`@saas/database`).
- **Design Tokens (`packages/gbs-design-system.css`)**: Central CSS token definitions (`--gbs-*`), theme rules (`data-theme="light|dark"`), glassmorphism styles, and typography tokens.

---

## Ecosystem Security & Technical Capabilities

1. **Enterprise CAPTCHA Subsystem**: Dynamic SVG distortion, noise lines, variable lengths, and **PCM WAV Audio Stream** for accessibility.
2. **Multi-Factor Authentication (MFA / 2FA)**: RFC 6238 TOTP engine, QR code `otpauth://` URI generator, 6-digit verification, and 8 single-use recovery codes.
3. **Identity & Access Management (IAM / OAuth2)**: OAuth SSO across 6 providers (Google, Microsoft, Apple, GitHub, Facebook, LinkedIn), portal signup policies, password history prevention, and forced expiry.
4. **Dynamic RBAC, Access Scopes & Approval Workflows**: Granular action permissions, data access scopes (`OWN`, `DEPARTMENT`, `TENANT`, `GLOBAL`), multi-step approval chains (`ApprovalWorkflow`), and Feature Flags capability targeting (`FeatureFlag`).
5. **Admin Control Center & White-Label**: Single enterprise control center for White-Label Branding (`/branding`), AI Prompt Template Versioning (`/ai-prompts`), Centralized Notifications (`/notifications`), and Global Command Search (`/global-search`).
6. **AI Provider & Model Governance**: Dynamic support for Google Gemini, OpenAI, Anthropic, and Cursor AI engines with tenant quotas and prompt template versioning.
7. **Google Business Profile (GBP) Integration**: Automated review harvesting, location management, star rating analytics, and AI-suggested replies.
