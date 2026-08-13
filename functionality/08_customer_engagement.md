# 08. Customer Engagement Platform Documentation

The **Customer Engagement Platform** (introduced in Phase 19) provides unified multi-channel inbox routing, call center IVR configuration, video/calendar booking sync, and compliance rule verification.

---

## 📄 Page 1: Inbox Providers — 10 Channels (`/inbox-providers`)

### Overview & Purpose
Unified messaging gateway connecting 10 major customer communication channels into a single unified agent inbox.

### Key Features & Functionality
1. **10 Channel Integrations**:
   - WhatsApp Business API
   - Messenger (Facebook)
   - Instagram Direct
   - Google Business Messages
   - Live Website Chat Widget
   - Email Inbox (IMAP/SMTP/Gmail API)
   - SMS (Twilio/Plivo)
   - Telegram Bot API
   - Line Messaging API
   - Apple Messages for Business
2. **Channel Configuration & Status**: Set API credentials, webhook callback URLs, and auto-assignment rules for each channel.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/inbox-providers/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/inbox-providers/page.tsx)
- **API Endpoint**: `GET /api/v1/inbox/providers`

---

## 📄 Page 2: Call Center & IVR (`/call-providers`)

### Overview & Purpose
Cloud telephony and Voice AI center for configuring phone numbers, IVR call trees, voice agent bots, and call recording storage.

### Key Features & Functionality
1. **Virtual Phone Number Purchasing**: Provision landline and toll-free numbers via Twilio/Vapi integrations.
2. **Visual IVR Builder**: Drag-and-drop IVR routing trees (e.g., Press 1 for Sales, Press 2 for Support, or transfer to AI Voice Agent).
3. **Voice AI Bot Routing**: Seamlessly hand off incoming calls to AI agents trained on RAG knowledge bases.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/call-providers/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/call-providers/page.tsx)
- **API Endpoint**: `GET /api/v1/telephony/providers`

---

## 📄 Page 3: Bookings & Video Sync (`/booking-providers`)

### Overview & Purpose
Appointment booking engine synchronizing calendar providers and video conference links (Google Meet, Zoom, MS Teams).

### Key Features & Functionality
1. **Calendar Provider Sync**: Connect Google Calendar, Outlook 365, and Apple iCloud calendars.
2. **Auto Video Link Generator**: Automatically attach Zoom or Google Meet links to scheduled appointments.
3. **Booking Widget Customizer**: Configure embeddable booking widgets with deposit payments via Stripe.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/booking-providers/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/booking-providers/page.tsx)
- **API Endpoint**: `GET /api/v1/bookings/providers`

---

## 📄 Page 4: Audit & Compliance Engine (`/compliance-rules`) & White-Label Governance (`/whitelabel-settings`)

### Overview & Purpose
Automated compliance checker enforcing GDPR, HIPAA, TCPA, and SOC 2 data protection standards across tenant operations.

### Key Features & Functionality
1. **Compliance Rule Sets**: Enable checks for Data Retention limits, Consent Logging, Right-to-be-Forgotten processing, and Encryption at Rest.
2. **White-Label Partner Rules**: Configure partner portal white-label limits, reseller commission rules, and domain DNS validation checks.

### How It Works (Technical Details)
- **Frontend Pages**: [`apps/admin-portal/app/compliance-rules/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/compliance-rules/page.tsx), [`apps/admin-portal/app/whitelabel-settings/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/whitelabel-settings/page.tsx)
