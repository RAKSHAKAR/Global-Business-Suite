# 04. Google & Social Media Suite Documentation

The **Google & Social Media Suite** powers multi-location Google Business Profile (GBP) integration, review management, automated post scheduling, and multi-channel social media publishing.

---

## 📄 Page 1: Google Business Studio (`/gbp-studio`)

### Overview & Purpose
Comprehensive management tool for Google Business Profile locations, reviews, post updates, QA management, and location performance analytics.

### Key Features & Functionality
1. **Multi-Location Sync**:
   - Connect Google accounts via OAuth2 SSO.
   - Sync business locations, addresses, phone numbers, opening hours, and cover photos across all tenant branches.
2. **Review Management & AI Auto-Responder**:
   - Live stream of customer Google reviews across all locations.
   - One-click **AI Reply Generation**: Automatically crafts personalized, tone-appropriate responses using customer sentiment analysis.
   - Auto-publish responses directly back to Google My Business API.
3. **Google Posts Publisher**:
   - Draft and publish Google Updates, Offers, and Events across single or multiple locations simultaneously.
4. **Local SEO Analytics**:
   - Location views, search queries (direct vs discovery), phone call actions, website clicks, and direction requests.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/gbp-studio/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/gbp-studio/page.tsx)
- **API Endpoints**:
  - `GET /api/v1/gbp/locations`
  - `GET /api/v1/gbp/reviews`
  - `POST /api/v1/gbp/reviews/:id/reply`
  - `POST /api/v1/gbp/posts`

---

## 📄 Page 2: Social Media Manager (`/social-studio`)

### Overview & Purpose
Multi-channel social post composer, content calendar, and publishing scheduler.

### Key Features & Functionality
1. **Multi-Platform Composer**: Write posts for Facebook, Instagram, LinkedIn, X (Twitter), YouTube, and TikTok in one unified interface.
2. **Visual Content Calendar**: Interactive monthly, weekly, and daily grid view showing scheduled, draft, and published posts.
3. **AI Post Assistant**: Generate captions, hashtags, image prompts, and optimal post scheduling times automatically.
4. **Media Upload & Preview**: Upload images/videos with live device preview (Desktop & Mobile feeds).

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/social-studio/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/social-studio/page.tsx)
- **API Endpoints**: `GET /api/v1/social/posts`, `POST /api/v1/social/posts`

---

## 📄 Page 3: Social Channels (`/social-channels`)

### Overview & Purpose
Account connection manager for managing social media OAuth API tokens and account credentials per tenant.

### Key Features & Functionality
1. **Connected Accounts Directory**: List connected Facebook Pages, Instagram Business profiles, LinkedIn Companies, and X handles.
2. **OAuth Authorization Flow**: Initiate 1-click social authentication flows with token refresh monitoring.
3. **Channel Health & Status**: Monitor token expiration dates and reconnect broken channel sessions.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/social-channels/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/social-channels/page.tsx)
- **API Endpoint**: `GET /api/v1/social/channels`
