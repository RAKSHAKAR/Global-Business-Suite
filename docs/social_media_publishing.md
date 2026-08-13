# Social Media Publishing — Enterprise Module (Phase 11)

## Overview

The GBS **Social Media Management & Marketing Automation** module enables enterprise tenants to connect, manage, publish, engage, and analyze content across **13+ social platforms** simultaneously from the **Admin Portal**, **Partner Portal**, **Customer Portal**, and **Mobile Apps**. It includes an AI-powered Content Studio, Unified Engagement Inbox, Social Listening Engine, Media Library, Multi-Level Approvals, and CRM Integration.

---

## Architecture

```
apps/api/src/
├── routes/v1/
│   ├── social.ts               ← Channel OAuth + Post CRUD + Publish dispatcher + Media Library + Approvals
│   ├── engagement.ts           ← Unified Inbox + Comments + Moderation + AI Reply Suggestions
│   ├── listening.ts            ← Keyword monitors + Brand mentions + Sentiment analysis + Competitor tracker
│   ├── socialAi.ts             ← AI Content Studio (Captions, Hashtags, Campaign Strategy, Best Time to Post)
│   ├── automation.ts           ← Automation rule engine (Trigger → Action)
│   └── adminSocialChannels.ts  ← Admin oversight & channel management
├── services/
│   ├── socialPublisher.ts      ← Multi-platform publisher engine (13+ channels)
│   ├── socialEngagementService.ts ← Inbox, comments & moderation service
│   ├── socialListeningService.ts  ← Brand mention & competitor tracking service
│   └── socialAiStudioService.ts   ← AI Captions, Hashtags & Best Time algorithm
└── workers/
    └── socialPublisherWorker.ts← Scheduled post dispatch, auto-queue & channel health check

apps/partner-portal/app/
└── social/page.tsx             ← Full Enterprise Social Media Suite UI
    ├── Tab 1: Composer         ← Rich editor, platform previews, UTM builder, AI Studio trigger
    ├── Tab 2: Posts            ← Paginated posts, approval status chips, version history
    ├── Tab 3: Channels         ← 13-network OAuth channel manager with health status
    ├── Tab 4: Unified Inbox    ← Real-time messaging, comment threads, AI reply suggestions
    ├── Tab 5: Social Listening ← Keyword monitors, brand mentions & sentiment breakdown
    ├── Tab 6: Media Library    ← Asset management, brand assets, AI media
    └── Tab 7: Analytics        ← Reach, impressions, engagement, campaign ROI

apps/admin-portal/app/
├── social-studio/page.tsx      ← Admin multi-channel composer & queue
└── social-channels/page.tsx    ← Platform-wide channel oversight & revoking

apps/customer-portal/src/app/
└── social/page.tsx             ← Customer social campaign & promotion engagement

apps/partner-mobile/
└── App.tsx                     ← Mobile Social Suite (Camera/Gallery upload, Offline Drafts queue, Push Notifications)
```

---

## Supported Social Networks

| Platform | Key Enum | Max Characters | Content Features |
|----------|----------|----------------|------------------|
| Google Business Profile | `GOOGLE_BUSINESS` | 1,500 | Posts, Offers, Events, Q&A, Photos |
| Facebook | `FACEBOOK` | 63,206 | Posts, Photos, Links, Carousels |
| Instagram | `INSTAGRAM` | 2,200 | Posts, Reels, Stories, Carousels |
| LinkedIn | `LINKEDIN` | 3,000 | Posts, Articles, Documents, Links |
| X (Twitter) | `TWITTER_X` | 280 | Tweets, Threads, Media |
| Pinterest | `PINTEREST` | 500 | Pins, Boards, Rich Media |
| TikTok | `TIKTOK` | 2,200 | Direct Video, Captions, Duets |
| Threads | `THREADS` | 500 | Threads, Images, Links |
| YouTube | `YOUTUBE` | 5,000 | Community Posts, Shorts, Videos |
| Reddit | `REDDIT` | 40,000 | Subreddit Text Posts, Link Submissions |
| Telegram | `TELEGRAM` | 4,096 | Channel Messages, Photos, Formatting |
| WhatsApp | `WHATSAPP` | 4,096 | Cloud API Business Messages, Templates |
| Snapchat | `SNAPCHAT` | 250 | Creative Ads & Stories (Scaffold) |

---

## Key Features

1. **Multi-Account & Multi-Workspace Scoping**: Connect multiple accounts, pages, businesses, and locations per tenant with OAuth health monitoring.
2. **AI Content Studio**: Instant AI Caption generation, hashtag generator, campaign strategy builder, and AI Best Time to Post recommendations.
3. **Unified Engagement Inbox**: Centralized message and comment management across WhatsApp, Instagram, Facebook, and Google Business with AI reply suggestions.
4. **Social Listening Engine**: Automated keyword tracking, brand mention aggregation, competitor tracking, and sentiment scoring (-1 to +1).
5. **Approval Workflows & Version History**: Multi-level approval (Draft → Pending → Approved → Scheduled) and immutable post version history.
6. **Media Library**: Organized folders, tags, brand assets, and AI-generated media.
7. **Mobile App Parity**: Camera/gallery capture, offline draft queueing, push notification alerts, and full mobile suite.

---

*Last updated: Phase 11 Enterprise Social Media Management & Marketing Automation complete.*
