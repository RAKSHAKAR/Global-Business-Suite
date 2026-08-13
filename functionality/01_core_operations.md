# 01. Core Operations Module Documentation

The **Core Operations** module provides multi-tenant telemetry, global search capabilities, client organization setup, and team hierarchy management.

---

## 📄 Page 1: Enterprise Admin Dashboard (`/`)

### Overview & Purpose
The main control tower for super admins and platform executives. It consolidates real-time health metrics, active user counts, revenue statistics, system job status, and telemetry widgets into a single interactive dashboard.

### Key Features & Functionality
1. **Telemetry KPI Bar**:
   - **Active Users**: Real-time counter showing total registered users vs active logged-in users.
   - **Monthly Recurring Revenue (MRR)**: Live financial metrics with currency tracking and MoM growth rate.
   - **System Health**: Health indicators showing API latency (in ms), error rates, database connection count, and server CPU/Memory percentage.
2. **20 Configurable Widgets Grid**:
   - Includes widgets for System Overview, Security Alerts, Queue Status, Background Cron Jobs, Notification Delivery Rates, Failed Jobs, Storage Usage, and License Quota allocation.
3. **Widget Configuration Drawer**:
   - Allows administrators to customize which widgets appear on their dashboard view.
4. **Snapshot Report Export**:
   - Generates an instant downloadable PDF/JSON snapshot report of platform telemetry for audit and executive reporting.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/page.tsx)
- **API Endpoint**: `GET http://localhost:4000/api/v1/admin/dashboard/widgets`
- **Authentication**: Requires a valid Bearer JWT header with Super Admin scope.

---

## 📄 Page 2: Global Search (`/global-search`)

### Overview & Purpose
A platform-wide indexing interface triggered via `Ctrl + K` or direct navigation. It searches across all tenants, users, organizations, AI agents, billing invoices, and audit logs simultaneously.

### Key Features & Functionality
1. **Universal Search Query Input**: Instant debounced search querying all data models.
2. **Category Filtering**: Filter results by Tenants, Users, Organizations, Invoices, AI Models, or Logs.
3. **Quick Navigation**: Clicking any result instantly routes to the corresponding management detail view.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/global-search/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/global-search/page.tsx)
- **API Endpoint**: `GET http://localhost:4000/api/v1/admin/global-search?q={query}`
- **Performance**: Utilizes PostgreSQL indexed `ILIKE` and full-text search for response times under 50ms.

---

## 📄 Page 3: Tenants Management (`/tenants`)

### Overview & Purpose
The core multi-tenant administration tool for managing client organizations, custom domains, status, and AI quota allocations.

### Key Features & Functionality
1. **Tenant Directory**: Paginated table listing tenant names, custom domains, subdomains, status (Active/Inactive), and creation timestamps.
2. **Tenant Creation & Editing Modal**:
   - **Name**: Organization name.
   - **Custom Domain & Subdomain**: Routing configuration for tenant white-labeling.
   - **Brand Color**: Color picker establishing the tenant's UI brand theme.
   - **Active State Toggle**: Instant enablement or suspension of tenant access.
3. **Tenant Deletion**: Deletes tenant record with strict cascade safety checks.
4. **Tenant AI Engines & Quotas Modal**:
   - Multi-select toggle for individual AI providers (OpenAI, Anthropic, Gemini, DeepSeek, etc.).
   - Custom Monthly Generation Quotas (0 = Unlimited).
   - Real-time token usage counter per provider.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/tenants/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/tenants/page.tsx)
- **API Endpoints**:
  - `GET /api/v1/tenants` (List tenants with pagination and search)
  - `POST /api/v1/tenants` (Create tenant)
  - `PUT /api/v1/tenants/:id` (Update tenant)
  - `DELETE /api/v1/tenants/:id` (Delete tenant)
  - `GET /api/v1/tenant-ai/:tenantId` (Fetch tenant AI engine configs)
  - `POST /api/v1/tenant-ai/bulk-tenant/:tenantId` (Save AI engine provider assignments & quotas)

---

## 📄 Page 4: Organizations & Teams (`/organizations`)

### Overview & Purpose
Enables hierarchical structural organization inside tenants, dividing users into departments, business units, and operational teams with granular scoped permissions.

### Key Features & Functionality
1. **Organization Tree & List View**: Visual hierarchy of parent-child department structures.
2. **Team Provisioning**: Create sub-teams (e.g., Marketing, Sales, Engineering) assigned to specific tenants.
3. **Member Management**: Assign team leaders and department managers, and define user seat allocations.
4. **Resource Scoping**: Enforces boundary rules so team members only access assets created within their designated team.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/organizations/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/organizations/page.tsx)
- **API Endpoints**:
  - `GET /api/v1/organizations`
  - `POST /api/v1/organizations`
  - `PUT /api/v1/organizations/:id`
