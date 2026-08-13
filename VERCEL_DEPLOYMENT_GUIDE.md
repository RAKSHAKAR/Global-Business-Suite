# Vercel & Cloud Deployment Guide for Global Business Suite (GBS)

This document provides a step-by-step walkthrough for deploying the **Global Business Suite (GBS)** enterprise monorepo to **Vercel** along with its cloud database and Express API backend gateway.

---

## 🏗️ Architecture & Production Topology

The repository is structured as a **pnpm + Turborepo monorepo**:

* **4 Next.js Web Portals** (`apps/admin-portal`, `apps/partner-portal`, `apps/customer-portal`, `apps/web-portal`)
* **1 Express Backend API Gateway** (`apps/api`)
* **1 Prisma Shared Database Package** (`packages/database`)

```
                  ┌──────────────────────────────────────────────┐
                  │          Vercel Platform (Serverless)        │
                  │  ┌──────────────┐      ┌──────────────────┐  │
                  │  │ admin-portal │      │ customer-portal  │  │
                  │  ├──────────────┤      ├──────────────────┤  │
                  │  │partner-portal│      │    web-portal    │  │
                  │  └──────────────┘      └──────────────────┘  │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTPS API Requests
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Express Backend API (`apps/api`)                      │
│   Option A (Recommended): Render / Railway / Fly.io / App Runner (Persistent)   │
│   Option B: Vercel Serverless Function (`api/index.ts`)                         │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ Prisma Connection String
                                         ▼
                       ┌──────────────────────────────────┐
                       │   Cloud PostgreSQL Database      │
                       │     (Supabase / Neon / Railway)  │
                       └──────────────────────────────────┘
```

> [!IMPORTANT]
> **Database Migration Requirement**:
> Locally, Prisma uses SQLite (`file:./dev.db`). SQLite files do not persist across Vercel serverless function invocations or multi-instance deployments. For production cloud deployment, connect to a cloud PostgreSQL database such as **Neon**, **Supabase**, **Railway Postgres**, or **Render Postgres**.

---

## 📌 Phase 1: Database Setup (Cloud PostgreSQL)

1. **Provision Managed PostgreSQL Database**:
   * Create a PostgreSQL database on **Neon.tech** or **Supabase.com**.
   * Obtain the connection URL (e.g., `postgresql://user:password@ep-xyz.us-east-1.aws.neon.tech/gbs_db?sslmode=require`).

2. **Update Prisma Schema for PostgreSQL**:
   In `packages/database/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Migrate & Seed Remote Database**:
   Execute the following commands from the root directory:
   ```bash
   # Set environment variable for remote database
   $env:DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

   # Push schema to PostgreSQL
   pnpm --filter database db:push

   # Seed default superadmin and enterprise roles
   pnpm --filter database dev:seed
   ```

---

## 📌 Phase 2: Deploying Next.js Frontends to Vercel

Each of the 4 Next.js portals can be deployed as an independent Vercel project connected to your Git repository.

### Vercel Project Settings Matrix

| Project Name | Root Directory | Framework Preset | Build Command | Output Directory |
| :--- | :--- | :--- | :--- | :--- |
| **gbs-admin-portal** | `apps/admin-portal` | Next.js | `cd ../.. && pnpm build --filter=admin-portal...` | `.next` |
| **gbs-partner-portal** | `apps/partner-portal` | Next.js | `cd ../.. && pnpm build --filter=partner-portal...` | `.next` |
| **gbs-customer-portal** | `apps/customer-portal` | Next.js | `cd ../.. && pnpm build --filter=customer-portal...` | `.next` |
| **gbs-web-portal** | `apps/web-portal` | Next.js | `cd ../.. && pnpm build --filter=web-portal...` | `.next` |

### Step-by-Step Vercel Portal Setup:

1. Push your monorepo code to **GitHub / GitLab / Bitbucket**.
2. Log into [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New ➔ Project**.
3. Import your Git repository.
4. For each portal (`admin-portal`, `partner-portal`, `customer-portal`, `web-portal`):
   * **Root Directory**: Select the portal directory (e.g. `apps/admin-portal`).
   * **Build & Output Settings**:
     * Enable *Override* for **Build Command**: `cd ../.. && pnpm build --filter=admin-portal...`
   * **Environment Variables**:
     ```env
     NEXT_PUBLIC_API_URL=https://your-api-domain.com
     NEXT_PUBLIC_CAPTCHA_SITE_KEY=your-recaptcha-key
     ```
5. Click **Deploy**.

---

## 📌 Phase 3: Deploying Express API Backend (`apps/api`)

### Option A (Recommended Enterprise Architecture): Deploy to Render / Railway / Fly.io

Because your Express API backend includes background workers (`BullMQ`), task scheduling, and active monitoring services, hosting on a persistent Node environment is recommended:

1. Create a **Web Service** in Render or Railway connected to your repository.
2. Configure settings:
   * **Root Directory**: `apps/api`
   * **Build Command**: `cd ../.. && pnpm install && pnpm build`
   * **Start Command**: `node dist/index.js`
   * **Environment Variables**:
     ```env
     NODE_ENV=production
     PORT=4000
     DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
     JWT_SECRET=your-secure-production-jwt-secret-key
     ADMIN_URL=https://gbs-admin-portal.vercel.app
     PARTNER_URL=https://gbs-partner-portal.vercel.app
     CUSTOMER_URL=https://gbs-customer-portal.vercel.app
     WEB_URL=https://gbs-web-portal.vercel.app
     ```

---

### Option B: Serverless Deployment on Vercel

To host the API serverless on Vercel:

1. Create `apps/api/vercel.json`:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "src/index.ts",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "src/index.ts"
       }
     ]
   }
   ```
2. Import `apps/api` in Vercel as a new Project with Root Directory `apps/api` and set environment variables.

---

## 🔑 Environment Variables Matrix

```env
# Cloud Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Security & Secrets
JWT_SECRET="super-secret-jwt-key-min-32-chars"
NODE_ENV="production"

# CORS Frontend Origins
ADMIN_URL="https://gbs-admin-portal.vercel.app"
PARTNER_URL="https://gbs-partner-portal.vercel.app"
CUSTOMER_URL="https://gbs-customer-portal.vercel.app"
WEB_URL="https://gbs-web-portal.vercel.app"

# API Gateway Endpoint (for frontends)
NEXT_PUBLIC_API_URL="https://your-api-domain.com"
```

---

## 🔍 Post-Deployment Verification & Testing

1. **Verify API Health Endpoint**:
   ```bash
   curl https://your-api-domain.com/health
   ```
   *Expected Response:* `{"status":"ok","database":"connected"}`

2. **Verify API Documentation**:
   Access `https://your-api-domain.com/api-docs` to view Swagger UI endpoints.

3. **Verify Portal Logins**:
   Access `https://gbs-admin-portal.vercel.app` and log in with Super Admin credentials (`admin@platform.local`).
