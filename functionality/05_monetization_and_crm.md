# 05. Monetization, CRM & Growth Documentation

The **Monetization, CRM & Growth** module manages subscriptions, automated invoicing, customer relationship pipelines, AI-driven lead scoring, marketing campaigns, and customer success management.

---

## 📄 Page 1: Subscriptions & Billing (`/billing`)

### Overview & Purpose
Global billing engine for managing subscription plans, tenant invoices, payment gateways, usage metering, and revenue recognition.

### Key Features & Functionality
1. **Subscription Plans Manager**: Define tier levels (Basic, Pro, Enterprise), recurring pricing (Monthly/Annual), and seat/feature entitlements.
2. **Tenant Subscriptions & Invoices**: View invoice history, payment status (Paid, Pending, Overdue), and issue refunds or manual invoice adjustments.
3. **Usage Metering**: Track extra usage charges (e.g., API calls over plan quota, additional storage, SMS credits).
4. **Payment Gateway Integration**: Manage Stripe/PayPal gateway keys, webhooks, and automatic retry policies for failed payments.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/billing/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/billing/page.tsx)
- **API Endpoints**: `GET /api/v1/billing/plans`, `GET /api/v1/billing/invoices`

---

## 📄 Page 2: CRM & Sales Pipelines (`/crm`)

### Overview & Purpose
Kanban pipeline board for managing deals, accounts, contacts, and sales stages across client organizations.

### Key Features & Functionality
1. **Kanban Pipeline Board**: Drag-and-drop deals across sales stages (Lead -> Qualified -> Proposal -> Negotiation -> Won/Lost).
2. **Deal Detail Drawer**: Track deal value, contact history, associated notes, emails, and activity logs.
3. **Sales Forecasting**: Analytics projecting expected revenue based on deal probability and pipeline velocity.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/crm/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/crm/page.tsx)
- **API Endpoints**: `GET /api/v1/crm/deals`, `POST /api/v1/crm/deals`

---

## 📄 Page 3: Lead Management & AI (`/leads`)

### Overview & Purpose
Inbound lead capture aggregator with automated AI scoring, enrichment, and routing.

### Key Features & Functionality
1. **Lead Directory**: Centralized inbox for leads captured via web forms, chat widgets, and Facebook Lead Ads.
2. **AI Lead Scoring**: AI model evaluates lead quality (0-100 score) based on company size, budget, interaction intent, and domain verification.
3. **Auto-Assignment Rules**: Automatically route high-scoring leads to designated sales reps or account managers.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/leads/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/leads/page.tsx)
- **API Endpoints**: `GET /api/v1/leads`, `POST /api/v1/leads/:id/score`

---

## 📄 Page 4: Marketing Center (`/marketing`) & Customer Success (`/customer-success`)

### Overview & Purpose
Campaign creation studio and customer health score tracker for driving retention and expansion revenue.

### Key Features & Functionality
1. **Email & SMS Campaigns**: Create targeted audience segments and schedule bulk broadcasts.
2. **Customer Health Matrix**: Health score (Green/Yellow/Red) computed from user activity, feature adoption, and support ticket frequency.
3. **Churn Alerting**: Automatic notifications sent to Customer Success Managers when tenant activity drops significantly.

### How It Works (Technical Details)
- **Frontend Pages**: [`apps/admin-portal/app/marketing/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/marketing/page.tsx), [`apps/admin-portal/app/customer-success/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/customer-success/page.tsx)
