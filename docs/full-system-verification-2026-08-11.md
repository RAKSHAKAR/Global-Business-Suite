# Full-system verification record — 2026-08-11

> **Release state: candidate, not production-certified.** The scoped unit suites, type checks noted below, Playwright discovery, and launcher validation are green. The final merged 30-test Playwright run, an actual nine-service launcher readiness run, the customer portal clean-generated type check, and live third-party provider tests remain release gates.

This page is the concise verification index for the theme, navigation, portal interlinking, responsive/mobile, API/security, AI content, approval, launcher, and `dhandha-ai` parity work. It records only checks actually run and links to the detailed guides instead of restating them.

## Status legend

- **PASS** — command completed successfully against the current workspace on 2026-08-11.
- **PENDING** — coverage exists, but the final post-merge command has not yet completed.
- **EXTERNAL** — implementation fails closed until an account owner supplies and authorizes a real provider.
- **BLOCKED** — an environmental prerequisite prevents the check; it is not represented as working.

## Verification matrix

| Area | Acceptance behavior | Automated or inspection evidence | Status |
|---|---|---|---|
| Admin theme | Light/dark changes computed page colors, persists after reload, and exposes accessible pressed state | [`e2e/admin-shell.spec.ts`](../e2e/admin-shell.spec.ts), [`AdminDashboardRedesign.test.tsx`](../apps/admin-portal/__tests__/AdminDashboardRedesign.test.tsx) | Unit **PASS**; full browser run **PENDING** |
| Admin layouts | All three choices produce distinct measured geometry; selected layout persists | [`e2e/admin-shell.spec.ts`](../e2e/admin-shell.spec.ts) | Browser coverage present; final run **PENDING** |
| Admin navigation | Ctrl/Cmd+K opens a focused command dialog, supports keyboard selection and Escape/focus restoration; sidebar collapse updates both widths and persists | [`e2e/admin-shell.spec.ts`](../e2e/admin-shell.spec.ts), [`TopHeader.test.tsx`](../apps/admin-portal/__tests__/components/TopHeader.test.tsx) | Unit **PASS**; full browser run **PENDING** |
| Portal themes/interlinks | Partner, Customer, and Web support persisted system/light/dark modes and link to all four web portals | [`e2e/portal-smoke.spec.ts`](../e2e/portal-smoke.spec.ts), portal theme tests | Unit **PASS**; full browser run **PENDING** |
| Responsive web UI | Admin mobile shell replaces the desktop sidebar; all login pages and public home have no horizontal overflow at 390×844 | [`e2e/admin-shell.spec.ts`](../e2e/admin-shell.spec.ts), [`e2e/portal-smoke.spec.ts`](../e2e/portal-smoke.spec.ts) | Final browser run **PENDING** |
| Route integrity | Explicit route inventories and every literal internal `href` are requested; 404, 5xx, Next not-found UI, and framework error overlays fail the test | [`e2e/route-integrity.spec.ts`](../e2e/route-integrity.spec.ts) | 8 browser tests discovered; execution **PENDING** |
| Authentication/RBAC | Signed-out users reach login; wrong-role tokens are removed and rejected; unauthenticated admin telemetry returns 401; tenant-scoped API mutations are covered | [`e2e/portal-smoke.spec.ts`](../e2e/portal-smoke.spec.ts), [`e2e/api.spec.ts`](../e2e/api.spec.ts), [`authBoundaryHardening.test.ts`](../apps/api/src/__tests__/authBoundaryHardening.test.ts), [`clientsTenantIsolation.test.ts`](../apps/api/src/__tests__/clientsTenantIsolation.test.ts) | Focused implementation coverage present; final API/browser regression **PENDING** |
| CAPTCHA/contact lead | CAPTCHA response does not expose the answer; incorrect input is rejected; the public form verifies CAPTCHA, creates a real tenant lead, and removes its test record through an authenticated tenant-scoped API | [`e2e/api.spec.ts`](../e2e/api.spec.ts), [`e2e/portal-smoke.spec.ts`](../e2e/portal-smoke.spec.ts) | Final browser/API run **PENDING** |
| Customer isolation | Customer routes require a linked tenant customer record rather than a shared demo fallback; partner/customer cross-portal attempts return 403 | [`customerPortal.test.ts`](../apps/api/src/__tests__/modules/customer-portal/customerPortal.test.ts), [`authBoundaryHardening.test.ts`](../apps/api/src/__tests__/authBoundaryHardening.test.ts) | Final merged API regression **PENDING** |
| AI “Post Content” | One request creates a caption and PNG, stores both on the same post, creates a pending approval request, blocks pre-approval publish, and still blocks approved publish when no active channel exists | [`e2e/api.spec.ts`](../e2e/api.spec.ts), [`socialContentPackageService.ts`](../apps/api/src/services/socialContentPackageService.ts) | Deterministic non-production contract coverage present; final run **PENDING**; live Gemini **EXTERNAL** |
| Social approval security | New/scheduled and legacy posts are tenant-scoped and approval-gated; edit/delete/review actions cannot bypass workflow state | [`legacySocialApprovalHardening.test.ts`](../apps/api/src/__tests__/legacySocialApprovalHardening.test.ts), [`gbpSyncWorkerApproval.test.ts`](../apps/api/src/__tests__/gbpSyncWorkerApproval.test.ts) | Focused suites previously green; final merged API regression **PENDING** |
| Mobile apps | Admin, Partner, and Customer Expo web previews persist themes, authenticate against `/auth/me`, restore sessions, render navigation, fit a phone viewport, and clear sessions on logout | [`e2e/mobile-apps.spec.ts`](../e2e/mobile-apps.spec.ts), mobile `__tests__` folders | Unit **PASS** (40 tests); final browser run **PENDING** |
| Launcher | Node/package/scripts/schema and nine declarations validate; dry run plans database preparation and all nine launch commands | [`setup.ps1`](../setup.ps1) | Validate and dry run **PASS**; actual readiness **PENDING** |

Rendered admin spot-check evidence is retained in [`artifacts/browser`](../artifacts/browser). Those screenshots demonstrate dark/light and layout/mobile rendered states, but do not replace the pending end-to-end assertions.

## Commands and results actually recorded

Run from the repository root in PowerShell.

### PASS — unit regression

```powershell
pnpm --filter admin-portal test -- --runInBand
pnpm --filter partner-portal test -- --runInBand
pnpm --filter customer-portal test -- --runInBand
pnpm --filter web-portal test -- --runInBand
pnpm --filter admin-mobile test -- --runInBand
pnpm --filter partner-mobile test -- --runInBand
pnpm --filter customer-mobile test -- --runInBand
```

| Workspace | Result |
|---|---:|
| Admin Portal | 4 suites, 17 tests passed |
| Partner Portal | 2 suites, 4 tests passed |
| Customer Portal | 3 suites, 7 tests passed |
| Web Portal | 3 suites, 11 tests passed |
| Admin Mobile | 4 suites, 14 tests passed |
| Partner Mobile | 4 suites, 13 tests passed |
| Customer Mobile | 4 suites, 13 tests passed |
| **Total** | **24 suites, 79 tests passed** |

### PASS — type checks, with one pending clean-generation check

```powershell
pnpm --filter admin-portal exec tsc --noEmit
pnpm --filter partner-portal exec tsc --noEmit
pnpm --filter web-portal exec tsc --noEmit
pnpm --filter admin-mobile typecheck
pnpm --filter partner-mobile typecheck
pnpm --filter customer-mobile typecheck
```

All six commands passed. `pnpm --filter customer-portal exec tsc --noEmit` is **PENDING** after it encountered a malformed generated `.next/dev/types/routes.d.ts` file during this run. Regenerate `.next` with the final Customer Portal build and rerun the type check; no pass is claimed here.

### PASS — Playwright discovery and launcher structure

```powershell
pnpm test:e2e:list
.\setup.ps1 -Action validate
.\setup.ps1 -Action start -DryRun -SkipInstall -NoBrowser
```

- Playwright discovered **30 tests in 6 files**.
- Launcher validation passed all nine declared services using Node.js 24.15.0 and pnpm 11.18.0.
- Dry run planned Prisma generation, non-destructive `prisma db push`, local seed execution, and all nine launch commands without starting processes.

Discovery is not execution. The final release gate remains:

```powershell
.\setup.ps1 -Action stop -NoBrowser
pnpm test:e2e
```

The suite must own port 4000 because its CAPTCHA and AI adapters are enabled only in the child API process. The expected final result is 30/30; **actual result: PENDING**. See [`e2e/README.md`](../e2e/README.md) and [`playwright.config.ts`](../playwright.config.ts) for credentials, service startup, Chrome selection, and artifact locations.

For focused reproduction:

```powershell
pnpm exec playwright test e2e/admin-shell.spec.ts
pnpm exec playwright test e2e/portal-smoke.spec.ts
pnpm exec playwright test e2e/route-integrity.spec.ts
pnpm exec playwright test e2e/api.spec.ts
pnpm exec playwright test e2e/mobile-apps.spec.ts

pnpm --filter api test -- --runInBand --runTestsByPath `
  src/__tests__/authBoundaryHardening.test.ts `
  src/__tests__/appleIdentityTokenService.test.ts `
  src/__tests__/clientsTenantIsolation.test.ts `
  src/__tests__/legacySocialApprovalHardening.test.ts `
  src/__tests__/googleBusinessProfileHardening.test.ts `
  src/__tests__/gbpSyncWorkerApproval.test.ts `
  src/__tests__/modules/socialEnterprise.test.ts `
  src/__tests__/modules/customer-portal/customerPortal.test.ts
```

The grouped API command is a final regression command, not a pass recorded by this page.

## `setup.ps1` operating contract

The interactive menu now exposes start, fresh start, safe update+start, update only, validate, status, stop, and deep clean. Equivalent non-interactive actions are `start`, `start-fresh`, `update`, `update-start`, `validate`, `status`, `stop`, `clean`, and `deploy`.

The nine managed services are API `4000`, Admin `3000`, Partner `3001`, Customer `3002`, Web `3003`, Admin Mobile Web `8081`, Partner Mobile Web `8082`, Customer Mobile Web `8083`, and Prisma Studio `5555`. A real start performs database generation, non-destructive schema synchronization, and seed repair before launching services and waiting for HTTP readiness.

Common commands:

```powershell
.\setup.ps1 -Action start -SkipInstall -NoBrowser
.\setup.ps1 -Action status
.\setup.ps1 -Action stop -NoBrowser
.\setup.ps1 -Action update-start -NoBrowser
```

Automatic update is currently **BLOCKED** because `SocialMedia` is an untracked folder nested beneath the unrelated Git root `...\scratch`. The launcher intentionally refuses to fetch/pull that parent repository and never auto-stashes or resets local work. To enable updates, the user must supply the intended repository URL and branch, and this folder must become its own clean tracked checkout with an upstream. Updates are then fast-forward-only.

## `dhandha-ai` audit and parity decision

The supplied `dhandha-ai` folder contains **11 JPEG screenshots and one MP4 recording (12 binary references total)**. It contains no application source, API/schema definition, configuration, design tokens, or license. The material also exposes personal/contact/OTP-like information. Therefore, none of those binaries or private values were copied into GBS; they were treated only as a capability reference.

| Referenced capability | GBS destination | Honest current boundary |
|---|---|---|
| AI social content/poster | Partner `/social`; Customer `/social` and `/ai-poster`; `/api/v1/social/ai/content-package` | Text+image package and approval workflow implemented; real generation needs Gemini or OpenAI credentials |
| Approval/rejection before posting | Partner and Customer social review queues | Publish returns a conflict until approved; approved posts also require an active connected channel |
| Google profile, reviews, and media | Partner `/gbp`; Customer `/gbp`, `/reviews`, `/google-media` | Tenant data paths implemented; live sync/publish needs approved GBP access and OAuth consent |
| Review invitations | Customer `/review-requests` | Delivery is reported only after a configured webhook accepts it; otherwise UI/API show unavailable |
| Plan, billing, and account | Customer `/my-plan`, `/payments`, `/account`; Partner `/settings`; Admin billing | Reads persisted tenant records; real card collection/webhooks need Stripe configuration |
| Reports and marketing tracking | Partner `/analytics` and `/reports`; Customer `/reports` and `/marketing-tracker` | Persisted data/export paths are used; provider delivery/warehouse sync remain disabled without adapters |
| Calendar, appointments, and QR-oriented flows | Partner `/calendar-tasks`, `/appointments`; Customer `/calendar`, `/appointments` | Portal routes exist; third-party calendar/video/native QR validation is not certified here |
| Connections, profile, security, and verification | Portal settings/security/account plus email/mobile verification routes | Local authenticated flows exist; live SSO, email, SMS, and WhatsApp require their provider credentials |

Architecture background is in [`social_media_publishing.md`](social_media_publishing.md), [`google_business_profile_and_reviews.md`](google_business_profile_and_reviews.md), and [`mobile_app_testing_and_deployment.md`](mobile_app_testing_and_deployment.md). Those broad architecture guides are not evidence that an external provider is connected.

## External providers and information required from the user

The application now fails closed instead of fabricating provider success. Production or live-integration verification cannot be completed until the account owner provides the following through `apps/api/.env` or a secret manager—not in source control, screenshots, or chat.

### Google/Gemini minimum procedure

1. In Google AI Studio, create a Gemini API key in the intended billed/quota project. Provide `GEMINI_API_KEY`; choose `AI_CONTENT_PROVIDER=gemini` and retain the configured image model unless a supported replacement is selected.
2. Use a Google account that owns/manages an active, verified Business Profile. Create a Google Cloud project, record its **project number**, and request Google Business Profile API access for that exact project. Google provides no GBP sandbox.
3. After approval, enable the Business Profile APIs, configure the OAuth consent screen/test users, and create a **Web application** OAuth client.
4. Register the local callback exactly as `http://localhost:4000/api/v1/google/callback`, then provide `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, a strong `ENCRYPTION_KEY`, and optionally `GOOGLE_OAUTH_STATE_SECRET`.
5. Provide the Google test-user emails and a tenant-managed Business Profile/location for consent and sync verification. For production, also provide the public HTTPS API origin/callback and durable generated-media storage plan.
6. Restart the API, confirm `/api/v1/social/ai/provider-status` reports Gemini configured, connect Google from the Partner Portal, and then run live generation, approval, GBP sync, and publish checks.

The exact account-console steps, required scopes, eligibility conditions, environment values, and official Google links are maintained in [`integrations/google-business-and-ai-setup.md`](integrations/google-business-and-ai-setup.md). The canonical variable inventory is [`apps/api/.env.example`](../apps/api/.env.example).

### Other live adapters

- Social publishing: approved provider application credentials/OAuth callbacks and a tenant-owned connected account for each selected network.
- Review requests: `REVIEW_REQUEST_WEBHOOK_URL` and `REVIEW_REQUEST_WEBHOOK_TOKEN` for an email/SMS/WhatsApp adapter.
- Reports/BI: `ANALYTICS_REPORT_DELIVERY_WEBHOOK_URL` and/or `BI_SYNC_WEBHOOK_URL`.
- Billing: Stripe publishable/secret/webhook credentials and a test-mode account.
- Public lead routing in production: `LEADS_TENANT_ID`.
- SSO/notifications/storage: the corresponding Apple/Microsoft/GitHub, SMTP/Twilio, and S3 credentials only for features intended for live certification.

## Final release gates

- [ ] Regenerate/build Customer Portal and pass its TypeScript check.
- [ ] Pass the final merged API regression command above (and broader API suite if time permits).
- [ ] Stop existing port 4000 service and pass `pnpm test:e2e` at 30/30; retain failure traces if any.
- [ ] Run `.\setup.ps1 -Action start -SkipInstall -NoBrowser`, then `.\setup.ps1 -Action status`, and record all nine HTTP-ready; stop or leave running as explicitly requested.
- [ ] Run the final monorepo build/lint gates selected for release.
- [ ] With owner-supplied credentials, certify Gemini output and each intended Google/social/payment/delivery provider separately. Deterministic test adapters are not provider certification.
