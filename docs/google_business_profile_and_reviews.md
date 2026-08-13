# Google Business Profile & Social Media — Enterprise Mega-Module

## Overview

The GBS **GBP + Social Mega-Module** is the unified engine for managing
Google Business Profile locations and cross-platform social media publishing
from both the **Partner Portal** and **Customer Portal**.

---

## Architecture

```
apps/api/src/
├── routes/v1/
│   ├── gbp.ts            ← Full GBP REST API (locations, reviews, posts, products, services, media, Q&A, messages, insights)
│   ├── social.ts         ← Social channel OAuth + post CRUD + publish dispatcher
│   └── automation.ts     ← Automation rule engine (CRUD, toggle, test-run)
├── services/
│   └── socialPublisher.ts ← Multi-platform publisher (9 channels)
└── workers/
    └── gbpSyncWorker.ts  ← Background: scheduled posts, GBP sync, automation rules
```

---

## API Endpoints

### GBP — `/api/v1/gbp/*`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/gbp/accounts` | List / Connect Google OAuth accounts |
| POST | `/api/v1/gbp/accounts/:id/reconnect` | Refresh OAuth tokens & check health |
| GET | `/api/v1/gbp/location-groups` | List location groups |
| GET/POST | `/api/v1/gbp/locations` | List / Create tenant locations |
| GET/PUT | `/api/v1/gbp/locations/:id` | Get / Update location profile details & hours |
| GET | `/api/v1/gbp/locations/:id/reviews` | Get reviews for location |
| POST | `/api/v1/gbp/locations/:id/reviews/:reviewId/reply` | Reply to a review |
| POST | `/api/v1/gbp/locations/:id/reviews/:reviewId/ai-reply` | Generate tone-aware AI reply |
| POST | `/api/v1/gbp/bulk/review-replies` | Bulk AI-reply to multiple reviews with tone selection |
| POST | `/api/v1/gbp/bulk/posts` | Bulk post creation across locations |
| POST | `/api/v1/gbp/ai/post-writer` | AI Post Writer with CTAs and image prompts |
| POST | `/api/v1/gbp/ai/seo-suggestions` | AI Local SEO keyword recommendations |
| POST | `/api/v1/gbp/ai/recommendations` | AI Performance insight recommendations |
| GET/POST | `/api/v1/gbp/locations/:id/posts` | List / Create GBP posts |
| GET/POST | `/api/v1/gbp/locations/:id/products` | Products catalog |
| GET/POST | `/api/v1/gbp/locations/:id/services` | Services catalog |
| GET/POST | `/api/v1/gbp/locations/:id/media` | Media gallery (photos & videos) |
| GET/POST | `/api/v1/gbp/locations/:id/questions` | Q&A customer questions |
| POST | `/api/v1/gbp/locations/:id/questions/:qId/answer` | Answer a question |
| GET/POST | `/api/v1/gbp/locations/:id/messages` | Customer messages inbox |
| GET | `/api/v1/gbp/locations/:id/insights` | Insights & daily analytics data |

### Social — `/api/v1/social/*`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/social/channels` | List connected social channels |
| DELETE | `/api/v1/social/channels/:id` | Disconnect channel |
| GET | `/api/v1/social/channels/oauth-url/:platform` | Get OAuth redirect URL |
| GET/POST | `/api/v1/social/posts` | List / Create social posts |
| PUT/DELETE | `/api/v1/social/posts/:id` | Update / Delete post |
| POST | `/api/v1/social/posts/:id/publish` | Publish post immediately |
| GET | `/api/v1/social/analytics` | Social analytics overview |

### Automation — `/api/v1/automation/*`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/automation/rules` | List / Create automation rules |
| PUT/DELETE | `/api/v1/automation/rules/:id` | Update / Delete rule |
| PATCH | `/api/v1/automation/rules/:id/toggle` | Enable / Disable rule |
| POST | `/api/v1/automation/rules/:id/test` | Test rule manually |

---

## Supported Social Platforms

| Platform | Enum | OAuth |
|----------|------|-------|
| Google Business Profile | `GOOGLE_BUSINESS` | Via GBP location |
| Facebook | `FACEBOOK` | Graph API v19 |
| Instagram | `INSTAGRAM` | Graph API (page-linked) |
| LinkedIn | `LINKEDIN` | LinkedIn API v2 |
| Pinterest | `PINTEREST` | Pinterest API v5 |
| TikTok | `TIKTOK` | TikTok Content Posting API |
| Threads | `THREADS` | Threads API |
| X / Twitter | `TWITTER_X` | Twitter API v2 |
| YouTube | `YOUTUBE` | YouTube Data API v3 |

---

## Background Worker — `gbpSyncWorker.ts`

Runs automatically when the API starts. Three independent timers:

| Timer | Interval | Purpose |
|-------|----------|---------|
| Post Dispatcher | 1 minute | Publishes scheduled GBP and Social posts |
| GBP Location Sync | 30 minutes | Syncs reviews, Q&A, insights from GBP API |
| Automation Rules | 5 minutes | Executes active automation rules (AI replies, alerts) |

---

## Automation Rule Types

| Trigger | Action | Description |
|---------|--------|-------------|
| `REVIEW_RATING_HIGH` | `REPLY_REVIEW_AI` | Auto AI-reply to 4–5 star reviews |
| `REVIEW_RATING_LOW` | `CREATE_TICKET` | Alert on 1–2 star reviews |
| `NEW_QUESTION` | `REPLY_QUESTION_AI` | Auto-answer new Q&A questions |
| `SCHEDULE_POST` | `PUBLISH_CONTENT` | Recurring scheduled posts |
| `COMPETITOR_REVIEW` | `NOTIFY` | Monitor competitor activity |

---

## Partner Portal Pages

| Route | Description |
|-------|-------------|
| `/gbp` | Full 10-tab GBP Hub (Overview, Reviews+AI, Posts, Products, Services, Media, Q&A, Messages, Insights, Automation) |
| `/social` | Social Publisher — Composer, Scheduling Calendar, Channel Manager, Analytics |

> Navigation: **Google & Social** section in the Partner Portal sidebar.

---

## Customer Portal Pages

| Route | Description |
|-------|-------------|
| `/gbp` | 3-tab view — Overview, Reviews (with AI reply), Insights |
| `/social` | 3-tab view — Create Post, My Posts, Channel Connections |

> Navigation: **Google Business** and **Social Media** items in the Customer Portal sidebar + mobile bottom nav.

---

## Database Models (Prisma)

| Model | Purpose |
|-------|---------|
| `SocialChannel` | OAuth credentials per tenant per platform |
| `SocialPost` | Post content, platforms JSON, status |
| `SocialPostPlatformResult` | Per-channel publish result (externalId, URL, error) |
| `GbpPost` | GBP-specific posts (offers, events, updates) |
| `GbpProduct` | Product catalog items |
| `GbpService` | Service list items |
| `GbpMedia` | Location media gallery (photos, videos) |
| `GbpQuestion` | Customer questions from GBP Q&A |
| `GbpAnswer` | Answers to GBP questions |
| `GbpInsight` | Daily GBP analytics snapshots |
| `GbpMessage` | Customer messaging inbox |
| `AutomationRule` | Rule config (trigger, action, conditions, schedule) |

---

## Environment Variables Required

```env
# Social OAuth (set per platform)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# GBP (Google My Business)
GBP_CLIENT_ID=
GBP_CLIENT_SECRET=
GBP_REDIRECT_URI=http://localhost:4000/api/v1/social/channels/oauth-callback

# App
API_BASE_URL=http://localhost:4000
```

## Admin Portal — Social Channel Oversight

Located at `/social-channels` in the Admin Portal (super-admin only).

| Feature | Description |
|---------|-------------|
| Platform filter | Filter by `FACEBOOK`, `INSTAGRAM`, `LINKEDIN`, etc. |
| Status filter | Active / Inactive / Expiring (within 7 days) / Expired |
| Token health | Visual badge per channel — Valid ✅ / Expiring ⚠️ / Expired ❌ |
| Revoke | Hard-delete channel connection (full audit log entry) |
| Deactivate | Soft-disable channel without deleting credentials |
| Stats | Platform distribution bar + aggregate counts card |

**API**: `GET /api/v1/admin/social-channels` · `DELETE /api/v1/admin/social-channels/:id`

---

*Last updated: 2026-08-01 — GBP+Social Mega-Module + Admin Oversight implementation*
