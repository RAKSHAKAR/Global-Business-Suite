# 06. Communication, Media & Analytics Documentation

The **Communication, Media & Analytics** module governs notification delivery systems, digital asset storage management, and executive business intelligence reporting.

---

## 📄 Page 1: Notification Templates (`/notifications`)

### Overview & Purpose
Omnichannel message template manager for Email, SMS, Web Push, and In-App notification triggers.

### Key Features & Functionality
1. **Template Editor**: Visual WYSIWYG and HTML editor for crafting email templates, SMS alerts, and Push notifications.
2. **Variable Injection**: Dynamic placeholder mapping (e.g., `{{user_name}}`, `{{invoice_amount}}`, `{{reset_link}}`).
3. **Provider Delivery Routes**: Route emails through SendGrid/AWS SES and SMS through Twilio with delivery status logging.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/notifications/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/notifications/page.tsx)
- **API Endpoint**: `GET /api/v1/notifications/templates`

---

## 📄 Page 2: Media & File Library (`/file-manager`)

### Overview & Purpose
Multi-tenant Cloud Storage asset manager supporting image, video, document, and asset organization.

### Key Features & Functionality
1. **Folder Hierarchy & File Explorer**: Drag-and-drop file upload, folder creation, and grid/list file layout.
2. **CDN & Image Optimization**: Generates public URLs, thumbnails, and optimized web formats (WebP/AVIF).
3. **Storage Quota Enforcement**: Real-time storage consumption tracking against tenant plan limits.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/file-manager/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/file-manager/page.tsx)
- **API Endpoint**: `GET /api/v1/files`

---

## 📄 Page 3: Enterprise Analytics (`/analytics`)

### Overview & Purpose
Executive analytics dashboard aggregating business metrics, platform usage trends, cohort retention, and system performance graphs.

### Key Features & Functionality
1. **Interactive Charts**: Line charts, bar graphs, and pie distributions built for multi-tenant analytics.
2. **Custom Date Filters**: Filter metrics by last 24h, 7 days, 30 days, quarterly, or custom ranges.
3. **Report Generation & Export**: Export raw data as CSV or PDF report summaries.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/analytics/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/analytics/page.tsx)
- **API Endpoint**: `GET /api/v1/analytics/overview`
