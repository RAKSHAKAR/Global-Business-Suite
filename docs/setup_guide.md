# Developer & Enterprise Admin Setup Guide

This document outlines the complete setup, configuration, and execution instructions for the Global Business Suite (GBS) ecosystem locally and in staging/production environments.

> 🚀 **Vercel & Cloud Production Deployment**: See [VERCEL_DEPLOYMENT_GUIDE.md](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/VERCEL_DEPLOYMENT_GUIDE.md) for full frontend and backend Vercel configuration.

---

## Prerequisites

- **Node.js**: v18 or higher recommended.
- **pnpm**: Package Manager (v8.15.5 or higher).
- **SQLite / Prisma CLI**: SQLite is used for local development database.

---

## Step 1: Environment & Secrets Configuration

Create a `.env` file in the root workspace directory with the following variables:

```env
PORT=4000
JWT_SECRET=super-secret-enterprise-jwt-key-2026
NODE_ENV=development

# OAuth Providers Configuration (Phase 2 IAM)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Mobile & CAPTCHA Verification
CAPTCHA_SECRET_KEY=demo-captcha-secret-key
```

---

## Step 2: Install Dependencies & Monorepo Build

From the monorepo root directory, install all dependencies across workspaces:

```bash
pnpm install
```

---

## Step 3: Database Initialization & Seeding

1. **Generate Prisma Client**:
   ```bash
   pnpm --filter database generate
   ```
2. **Push Database Schema**:
   ```bash
   pnpm --filter database db:push
   ```
3. **Seed Database**:
   Populate default Super Admin user (`admin@platform.local`), system roles, RBAC matrix, Feature Flags, and AI Engine settings:
   ```bash
   pnpm --filter database dev:seed
   ```

---

## Step 4: Run Development Servers

### Option A: Run Entire Monorepo via Turborepo

To start all 5 web portals and API services simultaneously:

```bash
pnpm dev
```

### Option B: Run Portals Individually

- **Backend API (Port 4000)**:
  ```bash
  pnpm --filter api dev
  ```
- **Admin Portal (Port 3000)**:
  ```bash
  pnpm --filter admin-portal dev
  ```
- **Partner Portal (Port 3001)**:
  ```bash
  pnpm --filter partner-portal dev
  ```
- **Customer Portal (Port 3002)**:
  ```bash
  pnpm --filter customer-portal dev
  ```
- **Marketing Web Portal (Port 3003)**:
  ```bash
  pnpm --filter web-portal dev
  ```
- **Mobile Apps in Web Mode**:
  ```bash
  pnpm --filter customer-mobile web --port 8083
  pnpm --filter partner-mobile web --port 8082
  pnpm --filter admin-mobile web --port 8081
  ```

---

## Step 5: Access Local Applications & Governance Portals

- **Admin Web Portal**: `http://localhost:3000` (Default Credentials: `admin@platform.local` / `admin123`)
  - **White-Label Branding**: `http://localhost:3000/branding`
  - **AI Prompt Versioning**: `http://localhost:3000/ai-prompts`
  - **Notification Control**: `http://localhost:3000/notifications`
  - **Feature Flags**: `http://localhost:3000/feature-flags`
  - **Approval Workflows**: `http://localhost:3000/approval-workflows`
  - **Roles & Permissions**: `http://localhost:3000/roles`
- **Partner Web Portal**: `http://localhost:3001`
- **Customer Web Portal**: `http://localhost:3002`
- **Marketing Public Site**: `http://localhost:3003`
- **Backend API & Swagger UI**: `http://localhost:4000/api-docs`

---

## Step 6: Testing & Validation Execution

- **Phase 2 IAM Integration Tests**:
  ```bash
  npx tsx apps/api/src/iam.test.ts
  ```
- **Phase 3 RBAC & Approval Tests**:
  ```bash
  npx tsx apps/api/src/rbac.test.ts
  ```
- **Phase 4 Enterprise Admin Control Suite**:
  ```bash
  npx tsx apps/api/src/adminPortal.test.ts
  ```
- **Monorepo Production Build Test**:
  ```bash
  pnpm build
  ```
