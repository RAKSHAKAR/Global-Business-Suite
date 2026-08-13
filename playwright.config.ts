import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

const isCI = Boolean(process.env.CI);
const artifactsRoot =
  process.env.PLAYWRIGHT_ARTIFACTS_DIR ||
  path.join(os.tmpdir(), "gbs-playwright-artifacts");

// The local Windows bootstrap uses the installed Chrome channel. CI can use
// Playwright's bundled Chromium after `pnpm exec playwright install chromium`.
const requestedChannel = process.env.PLAYWRIGHT_CHANNEL;
const browserChannel =
  requestedChannel === "bundled"
    ? undefined
    : requestedChannel || (process.platform === "win32" && !isCI ? "chrome" : undefined);

const desktopChrome = {
  ...devices["Desktop Chrome"],
  ...(browserChannel ? { channel: browserChannel } : {}),
};

const adminAuthState = path.join(os.tmpdir(), "gbs-admin-auth-state.json");

export default defineConfig({
  testDir: "./e2e",
  outputDir: path.join(artifactsRoot, "test-results"),
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(artifactsRoot, "html-report"), open: "never" }],
  ],
  use: {
    ...desktopChrome,
    headless: true,
    locale: "en-US",
    timezoneId: "Asia/Calcutta",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "admin-chromium",
      testMatch: /admin-shell\.spec\.ts/,
      dependencies: ["auth-setup"],
      use: {
        ...desktopChrome,
        storageState: adminAuthState,
      },
    },
    {
      name: "portals-chromium",
      testMatch: /(?:api|portal-smoke|route-integrity)\.spec\.ts/,
      use: desktopChrome,
    },
    {
      name: "mobile-web-chromium",
      testMatch: /mobile-apps\.spec\.ts/,
      use: {
        ...desktopChrome,
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter api dev",
      url: "http://localhost:4000/health",
      // The browser suite owns the API process so its CAPTCHA-only test adapter
      // cannot accidentally be enabled on a normal developer server.
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        GBS_E2E_TEST_MODE: "true",
        GBS_E2E_CAPTCHA_TOKEN: "gbs-playwright-captcha",
        AI_TEST_MODE: "true",
      },
    },
    {
      command: "pnpm --filter admin-portal dev",
      url: "http://localhost:3000/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "pnpm --filter partner-portal dev",
      url: "http://localhost:3001/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "pnpm --filter customer-portal dev",
      url: "http://localhost:3002/login",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "pnpm --filter web-portal dev",
      url: "http://localhost:3003",
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "pnpm --filter admin-mobile run web --port 8081 --clear",
      url: "http://localhost:8081",
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      command: "pnpm --filter partner-mobile run web --port 8082 --clear",
      url: "http://localhost:8082",
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      command: "pnpm --filter customer-mobile run web --port 8083 --clear",
      url: "http://localhost:8083",
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
});
