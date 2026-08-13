# GBS Playwright end-to-end tests

Run the full suite from the repository root:

```powershell
pnpm test:e2e
```

Playwright starts the API, all four web portals, and all three Expo web previews.
Stop a `setup.ps1` API instance first: the suite deliberately owns port 4000 so
its CAPTCHA test token is confined to that child process and is never enabled on
a normal development server. Other healthy local portal servers may be reused.
On local Windows machines it uses the installed Chrome channel. Set
`PLAYWRIGHT_CHANNEL=bundled` to use Playwright Chromium instead.

The seeded credentials can be overridden without editing tests:

- `GBS_E2E_ADMIN_EMAIL` / `GBS_E2E_ADMIN_PASSWORD`
- `GBS_E2E_PARTNER_EMAIL` / `GBS_E2E_PARTNER_PASSWORD`
- `GBS_E2E_CUSTOMER_EMAIL` / `GBS_E2E_CUSTOMER_PASSWORD`

Failure screenshots, videos, traces, and the HTML report are written under the
operating-system temp directory (`gbs-playwright-artifacts`) by default. Set
`PLAYWRIGHT_ARTIFACTS_DIR` to use another artifact directory.
