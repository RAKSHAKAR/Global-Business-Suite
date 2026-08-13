# Global Business Suite (GBS) — Release Notes
## Phase 10: Enterprise Google Business Profile (GBP) Platform

**Release Date:** August 7, 2026  
**Version:** 1.10.0  
**Status:** PRODUCTION READY  

---

### Executive Summary

Phase 10 transforms the **Google Business Profile (GBP)** module into an enterprise-grade local business management platform. It enables single-location and multi-location organizations to centralize Google OAuth account health monitoring, multi-account location grouping, AI-powered post writing, hashtag generation, tone/language-aware review responses, bulk operations, background sync scheduling, and RBAC security boundaries across all 4 web portals and 3 cross-platform mobile apps.

---

### Key Architectural Enhancements

1. **Multi-Account & Multi-Location OAuth Management**:
   - Dynamic `GbpAccount` connection tracking for multiple Google accounts per tenant.
   - Real-time token expiration monitoring (`HEALTHY`, `EXPIRING`, `EXPIRED`, `REVOKED`) with 7-day proactive warning alerts.
   - `GbpLocationGroup` organizational boundaries for multi-store chains and franchise management.

2. **Location Metadata & Opening Hours**:
   - Extended support for regular weekly hours, holiday hours, special date hours, secondary phone numbers, logo/cover media, appointment URLs, booking URLs, menu URLs, and delivery links.

3. **AI Content & Review Engine (`GbpAiService`)**:
   - Tone-aware review reply generation (`professional`, `friendly`, `apologetic`, `enthusiastic`).
   - AI Post Writer with call-to-action suggestions, keyword optimization, and image generation prompts.
   - AI Local SEO suggestions and performance optimization recommendations.

4. **Bulk Operations Subsystem**:
   - Bulk post publishing across multiple selected locations.
   - Bulk AI review replies with custom tone and language options.
   - Bulk product, service, and media updates.

5. **Approval Workflows & Scheduler**:
   - Configurable post approval workflow (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PUBLISHED`).
   - Recurring post scheduling (daily, weekly, monthly) via `gbpSyncWorker.ts`.

6. **Unified Web Portals & Mobile Apps Parity**:
   - **Admin Portal (`/gbp-studio`)**: Account Health monitoring, sync frequency controls, post approval rules, auto-reply thresholds.
   - **Partner Portal (`/gbp`)**: Full 10-tab hub with tone selector, location group filtering, post scheduler, and AI generators.
   - **Customer Portal (`/gbp`)**: Business profile overview, updates showcase, products & services catalog, review submissions.
   - **Mobile Apps (Admin, Partner, Customer)**: Parity across Admin Overseer, Partner Manager, and Customer Business Updates tabs.

---

### Database Schema Updates

- Added `GbpAccount` model (multi-account OAuth, token monitoring, permissions).
- Added `GbpLocationGroup` model (location grouping per tenant).
- Extended `Location` model with `googleAccountId`, `locationGroupId`, `hoursJson`, `attributesJson`, `links`.
- Extended `Review` model with `tenantId`, `tagsJson`, `category`, `moderationStatus`, `replyTone`, `replyLanguage`.
- Extended `GbpPost` model with `approvalStatus`, `isRecurring`, `recurrenceRule`, `targetLocationIds`.
- Added `GbpPostTemplate` and `GbpReviewReplyTemplate` models.

---

### Verification Summary

- **Unit & Integration Tests**: `apps/api/src/__tests__/modules/gbpEnterprise.test.ts`
- **Validation Results**: 100% test passing rate across account management, bulk operations, AI generators, and location sync routines.
