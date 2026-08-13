# Master Requirement Document: Dhanda AI Unified Marketing Suite
## Customer, Admin & Partner Tri-Portal Platform Specification

---

## 1. Executive Summary & Vision

This Master Requirement Document defines the complete functional, technical, and architectural specification for transforming the single-user **Dhanda AI Marketing** application into a **Unified 3-Tier Enterprise Marketing Suite**.

The system establishes a single monorepo powering three dedicated portals—**Customer Portal**, **Partner Portal (Reseller/Agency)**, and **Admin Portal (Super Admin)**—backed by shared microservices, a unified Prisma/PostgreSQL database, and the **GBS CSS Design System**.

---

## 2. Complete Functional Analysis of Original Dhanda AI Application
*(Reverse-Engineered from Visual Artifacts: Video Walkthrough & Screenshots)*

### 2.1 Onboarding & Multi-Tenant Profile Management
* **Authentication Engine:** 
  * Phone Number entry with OTP verification (SMS Gateway, Truecaller integration).
  * Google OAuth ("Connect with Google") to fetch linked Google Business Profiles (GBP).
* **Multi-Business Switcher:** 
  * Header dropdown to seamlessly switch between managed locations (e.g., *One Choice Kitchen*, *a2z Online Deals*, *First Choice Kitchen*).
* **Permissions & Onboarding:**
  * System permissions prompt for Contacts (for review requests) and Camera/Media (for uploads).
  * Data privacy & analytics opt-in/opt-out consent modal.

### 2.2 Dashboard & Marketing Performance Hub
* **Marketing Score Gauge:** Visual semi-circle 0–100 score indicator (`Poor`, `Average`, `Good`, `Excellent`) with action trigger (*Improve Marketing Score*).
* **Google Performance Analytics:** 30-day analytics for **Profile Views**, **Reviews**, and **Leads** (Calls & Directions requested).
* **Marketing Tracker Matrix:** Weekly task completion grid tracking:
  * AI Post Approved
  * AI Post Published
  * Reviews Requested
  * Media Uploaded
  * *Metrics: Target vs. Achieved vs. Pending with direct action navigation buttons.*
* **Growth Action Bar:** Dynamic progress bar showing pending actions (e.g., *"0 of 25 done • 25 left"*) with integrated Voice Assistant (`Dhanda Assistance`).
* **Social Calendar Widget:** Monthly calendar view displaying daily creative status (*Generated*, *Approved*, *Posted*, *No Post*).
* **Local Competitor Analysis:** Table showing local competitors with ratings and star counts.
* **Social Connections:** Quick OAuth connect toggles for Facebook Pages and Instagram Business accounts.

### 2.3 AI Poster & Creative Studio (`AI Post`)
* **Creative Template Categories:**
  * Features (3 styles)
  * Product Showcase (4 styles)
  * Call Out (5 styles)
  * Testimonial (1 style)
  * Interactive (4 styles)
* **AI Generation Workflow (Dhanda AI Studio):**
  * Automated execution stages: *Analyzing Brand* → *Selecting Colors* → *Crafting Copy* → *Generating Visuals* → *Adding Final Touches*.
  * Real-time card preview containing logo, tagline, call-to-action (CTA), phone, address, and high-converting copy.
  * Image vs. Video poster output selector.
* **Feedback & Quality Tuning:**
  * *"Did you like this poster? [Yes 👍] [No 👎]"*
  * Quick feedback chips (*My Logo is missing*, *Not relevant to my business*, *Did not like model*, *Did not like CTA*, *Hook line can be better*) plus custom text feedback.
* **Publishing Channels:** Direct publish to Google Business Profile, Instagram, Facebook, and WhatsApp.

### 2.4 Review Management & AI Reply Engine (`Reviews`)
* **Google Review Aggregation:** Real-time sync of star ratings and text reviews.
* **Analytics & Trends:** Views trend graph with time filters (*This Month*, *Last 6 Months*, *Last 12 Months*).
* **Review States:** Tabbed views for `All`, `Pending`, `Replied`.
* **AI Review Reply Generator:**
  * One-click *"Reply with AI"* button.
  * Keyword Optimization: Embeds high-search-volume local keywords into responses to boost local SEO ranks.
  * Response Customization: Length slider (*Ultra Short*, *Short*, *Medium*, *Long*), language selector (*English*, *Hindi*, etc.), and star-category presets (3–5 stars vs. 1–2 stars).

### 2.5 Contact Review Requests & Automation (`Request Log`)
* **Review Request Counters:** Tracks *Sent*, *Link Opens*, *Target* (e.g., 00/15 per week).
* **Automated Growth Engine (*Grow Reviews Daily*):** Sends automated review requests to contacts (e.g., 20 requests/day, scheduled sends).
* **Contact Import & Dispatch:** Phone contact book integration, manual single-contact send, and customer status tracking (`Requested`, `Open`, `Reminded`, `Scheduled`).
* **Physical QR Standee & Builder:** Camera QR code scanner for linking in-store QR standees, plus custom QR code generator (up to 50 QRs per business).

### 2.6 Local SEO & Keyword Planner
* **Locality & Search Volume Tracking:** Search volume discovery for high-converting local search terms (e.g., *"best restaurants near me"*, *"tiffin service near me"*).
* **Keyword Rank Monitoring:** Tracks keyword usage counts in AI content and resulting rank placement on Google Maps.

### 2.7 Brand Preferences & Enterprise Customization
* **Branding Inputs:** Logo, phone, address, unique differentiators, industry low-standards & solutions, malpractices & solutions, interior photos (1–5), team photos (1–5).
* **Targeting Parameters:** Target gender, age group, region, model ethnicity, audience segment, custom CTAs, brand color pickers.
* **Auto-Pilot Controls:** Auto-publish toggles for Google/FB/IG, creative auto-approval toggles, voice assistant toggle.

### 2.8 Subscription, Monetization & Troubleshooting
* **Plan Tiering:** Starter (₹999/mo), Pro (₹12,000/yr), 3-Year Enterprise (₹30,000).
* **Billing Details:** VAT/GSTIN input, billing address, shipping address, payment mandates, transaction history.
* **Social Connect Troubleshooter:** Built-in step-by-step diagnostic guide for resolving Facebook/Instagram OAuth token, permission, and page association issues.

---

## 3. Tri-Portal Feature Matrix (Point-by-Point Specification)

To provide identical feature depth while supporting role-based operational needs, every functionality is implemented across **Customer**, **Partner**, and **Admin** portals.

```
+-----------------------------------------------------------------------------------+
|                              UNIFIED BACKEND ENGINE                               |
|       (REST APIs, Prisma ORM, AI Orchestrator, GBP Integration, Multi-Tenant)     |
+-------------------------+-------------------------+-------------------------------+
                          |                         |
                          v                         v
+-------------------------+---+ +-------------------+---------+ +-------------------+---+
|     CUSTOMER PORTAL         | |      PARTNER PORTAL         | |      ADMIN PORTAL         |
|  (Business Owner View)      | | (Reseller / Agency View)    | | (Super Admin Master)    |
+-----------------------------+ +-----------------------------+ +---------------------------+
```

---

### 3.1 Point-by-Point Feature Requirements

#### Feature 1: Multi-Tenant Business & Profile Management
* **Customer Portal:** Manage owned business profiles, link GBP accounts via Google OAuth, toggle between owned locations.
* **Partner Portal:** Onboard new client businesses, assign accounts to partner sub-agents, switch between managed client profiles with 1-click impersonation/management view.
* **Admin Portal:** Global tenant directory, override tenant settings, assign partners to tenants, manage global GBP API client keys, force-reconnect expired OAuth tokens.

#### Feature 2: Marketing Score & Performance Dashboard
* **Customer Portal:** View own business Marketing Score (0-100), 30-day Google performance graphs (views, reviews, leads), weekly task completion matrix, growth action list.
* **Partner Portal:** Portfolio-wide benchmark overview, view top-performing and under-performing clients by Marketing Score, batch trigger growth actions for low-score clients, export white-labeled client PDF reports.
* **Admin Portal:** Platform-wide analytics dashboard, system health KPIs, average score across all registered businesses, global task throughput metrics, custom report builder.

#### Feature 3: AI Creative & Poster Studio (`AI Post`)
* **Customer Portal:** Select poster category, run AI generator, preview generated poster with brand details, submit feedback thumbs up/down, edit text, publish directly or schedule.
* **Partner Portal:** Create poster templates for client niches, bulk-generate creative campaigns across multiple client profiles, review and batch-approve pending client creatives, download high-res assets for manual printing/ads.
* **Admin Portal:** Master AI prompt library editor, brand color/font palette engine management, LLM model routing & token quota allocation, global creative review queue, AI generator performance benchmarks.

#### Feature 4: Review Aggregation & AI Reply Engine (`Reviews`)
* **Customer Portal:** Monitor Google reviews, receive new review notifications, 1-click AI reply with local SEO keyword injection, configure auto-reply rules by star rating.
* **Partner Portal:** Client review dashboard, bulk AI review reply approval across client accounts, set custom reply style guidelines per client, review sentiment alert triggers.
* **Admin Portal:** System-wide review log stream, AI review reply accuracy metrics, global blacklist for keyword injection, sentiment analysis thresholds, GBP API review sync status monitor.

#### Feature 5: Customer Contact & Review Request Automation (`Request Log`)
* **Customer Portal:** Import device contacts, configure daily automated review request campaigns (e.g., 20/day), track request delivery/opens, generate QR codes and standees.
* **Partner Portal:** Provision client SMS/WhatsApp review request credits, upload customer CSV lists for clients, configure custom domain review landing pages, monitor client conversion rates.
* **Admin Portal:** Global SMS/WhatsApp gateway configuration, delivery success rate monitoring, automated abuse/spam detection for mass review requests, global QR code tracking registry.

#### Feature 6: Local SEO & Keyword Rank Planner
* **Customer Portal:** Search city/locality keyword volumes, add keywords to brand profile, track search volume and local rank performance, track credit usage.
* **Partner Portal:** Comprehensive keyword research tool for client market analysis, assign targeted SEO keywords to clients, track client ranking improvements over time.
* **Admin Portal:** Global keyword data provider API configuration (SerpAPI/Google Keyword Planner integrations), system credit allotment management, search cache controls.

#### Feature 7: Brand Preferences & Deep Customization
* **Customer Portal:** Maintain logo, address, contact details, competitive differentiators, malpractices & solutions, interior & team media galleries, target demographic filters.
* **Partner Portal:** Audit and complete client brand preference profiles, set client brand guidelines, upload client media kits, lock critical brand parameters from customer modification.
* **Admin Portal:** Schema field editor for brand preferences, mandatory profile completeness thresholds, media storage quota rules (S3/GCS), automated NSFW/quality image filter rules.

#### Feature 8: Social Media Channel Integrations & Troubleshooting
* **Customer Portal:** Connect Facebook Pages and Instagram Business accounts, execute built-in interactive diagnostic guide to resolve OAuth connection errors.
* **Partner Portal:** Connect client social media accounts on behalf of clients, view diagnostic alert log for disconnected client social channels, send 1-click reconnect requests to clients.
* **Admin Portal:** Meta App registration & App ID management, global OAuth token refresh daemon status, API rate-limit monitoring for Facebook/Instagram APIs.

#### Feature 9: Subscriptions, Billing & Partner Commissions
* **Customer Portal:** Select subscription plans (Starter ₹999/mo, Pro ₹12,000/yr, 3-Year ₹30,000), manage payment billing details (GSTIN, addresses), view invoice history.
* **Partner Portal:** Manage wholesale client pricing, track partner commission earnings, generate client invoice links, request payout withdrawals.
* **Admin Portal:** Subscription tier configuration, discount code & promotional campaign builder, payment gateway management (Razorpay, Stripe), commission payout approval queue, platform financial revenue reports.

#### Feature 10: Multi-Channel Push Notifications & Assistance
* **Customer Portal:** Receive push notifications for pending creative approvals, review alerts, and milestone achievements; access `Dhanda Assistance` voice bot.
* **Partner Portal:** Configure notification preferences for account managers, receive digest alerts for client actions, trigger broadcast messages to clients.
* **Admin Portal:** Global push notification campaign dispatch engine (Firebase Cloud Messaging), system alert broadcasts, voice AI model configuration and logging.

---

## 4. Non-Functional & Enterprise Architecture Requirements

1. **Multi-Tenant Data Isolation:** Enforce row-level tenant filtering (`tenantId` / `profileId`) across all queries via Prisma middleware.
2. **Role-Based Access Control (RBAC):** Strict permission guards on API endpoints (`SUPER_ADMIN`, `PARTNER_ADMIN`, `PARTNER_AGENT`, `CUSTOMER_OWNER`, `CUSTOMER_STAFF`).
3. **Responsive Design System:** Unified styling via `gbs-design-system.css` supporting desktop screens, tablets, and mobile web viewports.
4. **Security & Compliance:** OWASP compliance, encrypted OAuth token storage (AES-256), visual CAPTCHA on authentication endpoints, strict audit logging for administrative overrides.
5. **Automated Testing & QA:** Programmatic E2E test coverage using Playwright covering end-to-end user journeys for Customer, Partner, and Admin workflows.

---

## 5. Summary Matrix: Tri-Portal Capabilities

| Feature Category | Customer Portal | Partner Portal | Admin Portal |
| :--- | :--- | :--- | :--- |
| **Profile Access** | Self Business Profiles | Assigned Client Profiles | All Platform Profiles |
| **Marketing Score** | View & Execute Actions | Client Portfolio Analytics | Platform Global Benchmarks |
| **AI Poster Studio** | Generate, Edit & Publish | Bulk Generate & Client Templates | Master Prompts & Token Quotas |
| **Review Automation** | 1-Click AI Reply & Daily Requests | Multi-Client AI Replies & CSV Import | Global API Sync & Spam Guard |
| **Local SEO Planner** | View City Keyword Volume | Client Keyword Research Tool | Provider API & Credit Allocations |
| **Social Connections** | OAuth Connect FB / IG | Client Social Account Manager | Meta App & OAuth Token Daemon |
| **Billing & Plans** | Pay Subscription | Client Invoicing & Commissions | Plan Builder & Payout Queue |
| **Support & Guides** | Interactive Social Troubleshooter | Client Reconnect Diagnostics | System Audit & Health Logs |

