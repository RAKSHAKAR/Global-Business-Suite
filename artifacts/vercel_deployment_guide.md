# Complete Vercel Deployment Guide (Frontend & Backend)

This guide provides step-by-step instructions for deploying full-stack web applications on **Vercel**. It covers the three most common modern architectures:

1. **Option A: Unified Full-Stack Framework** (Next.js, SvelteKit, Nuxt, Remix) — *Recommended for Vercel*
2. **Option B: Monorepo / Single Repo** (Vite/React Frontend + Node.js/Express `api/` Serverless Functions on Vercel)
3. **Option C: Decoupled Architecture** (Vercel Frontend + External Backend on Render/Railway/GCP/AWS)

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Option A: Unified Full-Stack Framework (Next.js, etc.)](#option-a-unified-full-stack-framework-nextjs-etc)
- [Option B: Monorepo Frontend + Express/Node API on Vercel](#option-b-monorepo-frontend--expressnode-api-on-vercel)
- [Option C: Decoupled Deployment (Vercel Frontend + External Backend)](#option-c-decoupled-deployment-vercel-frontend--external-backend)
- [Database & Connection Pooling Best Practices](#database--connection-pooling-best-practices)
- [Managing Environment Variables](#managing-environment-variables)
- [Deploying via Vercel CLI & Git (CI/CD)](#deploying-via-vercel-cli--git-cicd)
- [Troubleshooting & Common Issues](#troubleshooting--common-issues)

---

## Architecture Overview

| Architecture | Frontend Host | Backend Host | Best Use Case |
| :--- | :--- | :--- | :--- |
| **Option A: Unified** | Vercel Edge/CDN | Vercel Serverless / Edge Functions | Next.js, Nuxt, SvelteKit, Remix apps with built-in API routes |
| **Option B: Monorepo API** | Vercel CDN | Vercel Serverless (`/api` directory) | React/Vite SPA with lightweight Node.js/Express serverless handlers |
| **Option C: Decoupled** | Vercel CDN | External (Render, Railway, Fly.io, AWS, GCP) | Express/NestJS/Fastify backend requiring long-running WebSocket connections or background tasks |

---

## Option A: Unified Full-Stack Framework (Next.js, etc.)

Frameworks like Next.js automatically compile frontend components into static assets or SSR pages while compiling `app/api/` or `pages/api/` into Vercel Serverless Functions.

### 1. File Structure Example (Next.js App Router)
```text
my-fullstack-app/
├── app/
│   ├── api/
│   │   └── users/
│   │       └── route.ts       <-- Serverless API Endpoint (Backend)
│   ├── page.tsx               <-- Frontend UI Component
│   └── layout.tsx
├── public/
├── .env.local                 <-- Local secrets (do NOT commit)
├── next.config.mjs
└── package.json
```

### 2. Sample API Route (`app/api/users/route.ts`)
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: Request) {
  const body = await request.json();
  // Handle backend database operation here
  return NextResponse.json({ success: true, data: body }, { status: 201 });
}
```

### 3. Deployment Steps
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** > **Project**.
3. Import your Git repository.
4. Vercel will automatically detect **Next.js** (or SvelteKit/Nuxt) and configure:
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Add your backend environment variables under **Environment Variables** (e.g., `DATABASE_URL`).
6. Click **Deploy**.

---

## Option B: Monorepo Frontend + Express/Node API on Vercel

If you built a frontend app using Vite, React, or Vue alongside a Node.js/Express backend inside a single repository, Vercel can run your backend endpoints as serverless functions using `vercel.json` rewrites.

### 1. Recommended Repository Structure
```text
my-project/
├── api/                       <-- Vercel serverless entry points (Backend)
│   └── index.js               <-- Express server wrapper
├── src/                       <-- Frontend source code (Vite / React)
│   ├── App.jsx
│   └── main.jsx
├── public/
├── index.html
├── vercel.json                <-- Routing & build configuration
├── package.json
└── vite.config.js
```

### 2. Express Server Wrapper (`api/index.js`)
Convert or wrap your Express app so Vercel can invoke it statelessly:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Sample API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/items', async (req, res) => {
  // DB logic here
  res.json([{ id: 1, name: 'Sample Item' }]);
});

// Export the Express app as a module handler for Vercel
module.exports = app;
```

### 3. Vercel Configuration File (`vercel.json`)
Place `vercel.json` in the root of your project to route `/api/*` traffic to your Node backend while serving static frontend assets for all other routes:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 4. Updating Package Scripts (`package.json`)
Ensure your build scripts are properly named:

```json
{
  "name": "my-fullstack-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
```

---

## Option C: Decoupled Deployment (Vercel Frontend + External Backend)

Use this pattern if your backend is a long-running server (Express, NestJS, FastAPI, Django) hosted on Render, Railway, Fly.io, AWS, or GCP.

### 1. Frontend Configuration (Vercel)
In your Vite/React project, reference the backend URL via environment variables.

#### Vite (`.env.production`):
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

#### Calling Backend from Frontend:
```javascript
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function fetchUsers() {
  const response = await fetch(`${API_URL}/api/users`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}
```

### 2. Backend CORS Configuration (Node.js/Express on Render/Railway)
Allow requests from your Vercel deployment domain:

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://your-app-name.vercel.app',
  'https://www.yourcustomdomain.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));
```

---

## Database & Connection Pooling Best Practices

Vercel functions are **ephemeral** and **stateless**. Traditional database drivers (PostgreSQL `pg`, MySQL `mysql2`) open persistent connection pools that can quickly exhaust your database server's max connection limit during traffic spikes.

### Solutions:
1. **Use Serverless Connection Poolers:**
   - **Neon Postgres:** Built-in WebSocket connection pooling (`@neondatabase/serverless`).
   - **Supabase:** Enable Connection Pooling (PgBouncer mode on port `6543`).
   - **Prisma:** Use **Prisma Accelerate** or set `connection_limit=1` in your `DATABASE_URL`.
   - **MongoDB Atlas:** Use the Data API or reuse the MongoClient promise across invocations.

### Example: Efficient MongoDB Connection Handler on Vercel
```javascript
// lib/mongodb.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add MONGODB_URI to your environment variables');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;
```

---

## Managing Environment Variables

Vercel enforces strict scope separation for safety:

| Prefix | Scope | Visible To |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_` (Next.js) | Frontend & Backend | Browser Client & Server |
| `VITE_` (Vite) | Frontend Only | Browser Client (bundled at build time) |
| None (e.g. `DATABASE_URL`, `JWT_SECRET`) | Backend Serverless Only | Vercel Node.js Serverless Functions |

### Adding Environment Variables on Vercel Dashboard
1. Go to **Project Settings** > **Environment Variables**.
2. Key: `DATABASE_URL`, Value: `postgresql://user:pass@host:5432/dbname`
3. Check target environments: **Production**, **Preview**, **Development**.
4. Click **Save**.

> **Note:** Whenever you update environment variables, you must redeploy your application for the build step to consume the updated values.

---

## Deploying via Vercel CLI & Git (CI/CD)

### 1. Automated Git Deployment (Recommended)
1. Link your project repository on [vercel.com](https://vercel.com).
2. Every `git push origin main` automatically triggers a **Production Deployment**.
3. Every pull request or branch push generates a unique **Preview Deployment URL**.

### 2. Manual CLI Deployment
Install the Vercel CLI globally:

```bash
npm install -g vercel
```

#### Log in to Vercel:
```bash
vercel login
```

#### Deploy Preview Environment:
Run from your root directory:
```bash
vercel
```

#### Deploy Production Environment:
```bash
vercel --prod
```

#### Pull Vercel Environment Variables to Local Machine:
```bash
vercel env pull .env.local
```

---

## Troubleshooting & Common Issues

### 1. `404: NOT_FOUND` on Page Refresh (Single Page Apps / React Router)
* **Cause:** The browser requests a path like `/dashboard` directly from the server, but no static file named `dashboard.html` exists.
* **Fix:** Add a rewrite rule in `vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### 2. Function Execution Timeout (`FUNCTION_INVOCATION_TIMEOUT`)
* **Hobby Plan Limit:** 10 seconds execution limit for serverless functions.
* **Pro Plan Limit:** 60 seconds (configurable up to 300 seconds).
* **Fix:** Keep API routes lean. For heavy background tasks (e.g., video processing or large PDF exports), delegate to background job workers (e.g., Inngest, QStash, or Trigger.dev).

### 3. CORS Policy Errors
* **Cause:** Frontend domain (e.g., `https://my-app.vercel.app`) is missing from backend allowed origins header.
* **Fix:** Ensure backend responds with headers:
  - `Access-Control-Allow-Origin: https://my-app.vercel.app`
  - `Access-Control-Allow-Credentials: true`

### 4. Database "Too Many Connections" Error
* **Cause:** Each incoming serverless request opens a new connection to SQL/Postgres.
* **Fix:** Enable connection poolers (PgBouncer) or connection proxy solutions (Prisma Accelerate / Neon Serverless Driver).

---

## Quick Reference Summary Checklist

- [ ] Repository committed to GitHub / GitLab
- [ ] Root `package.json` contains valid `build` script
- [ ] Backend environment variables (`DATABASE_URL`, `SECRET_KEY`) set in Vercel Dashboard
- [ ] Frontend environment variables (`NEXT_PUBLIC_API_URL` or `VITE_API_URL`) configured
- [ ] `vercel.json` added (if using custom monorepo or Vite + Express serverless setup)
- [ ] Database connection pooling configured for serverless compatibility
- [ ] CORS headers configured on backend for production Vercel domain
