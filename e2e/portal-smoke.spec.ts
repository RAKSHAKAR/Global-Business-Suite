import { expect, test } from "@playwright/test";
import {
  ADMIN_URL,
  API_URL,
  CUSTOMER_URL,
  PARTNER_URL,
  WEB_URL,
  credentials,
} from "./helpers/environment";
import { loginThroughPortalUi } from "./helpers/auth";
import {
  collectRuntimeErrors,
  expectNoHorizontalOverflow,
  expectRuntimeHealthy,
} from "./helpers/runtime";

test.describe("public and authenticated portal smoke", () => {
  test("Partner, Customer, and Web themes persist and portal links are complete", async ({ page }) => {
    const portals = [
      { url: `${PARTNER_URL}/login`, storageKey: "gbs-partner-theme:v1", current: "Partner Portal" },
      { url: `${CUSTOMER_URL}/login`, storageKey: "gbs-customer-theme:v1", current: "Customer Portal" },
      { url: `${WEB_URL}/`, storageKey: "gbs-web-theme:v1", current: "Public Website" },
    ] as const;

    for (const portal of portals) {
      await page.goto(portal.url);
      const root = page.locator("html");

      await page.getByRole("button", { name: "Use dark theme" }).click();
      await expect(root).toHaveAttribute("data-theme", "dark");
      await expect(root).toHaveAttribute("data-theme-preference", "dark");
      await expect(root).toHaveClass(/dark/);
      await expect
        .poll(() =>
          page.evaluate((key) => {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw).mode : null;
          }, portal.storageKey),
        )
        .toBe("dark");

      await page.reload();
      await expect(root).toHaveAttribute("data-theme", "dark");
      await expect(page.getByRole("button", { name: "Use dark theme" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await page.getByRole("button", { name: "Use system theme" }).click();
      await page.emulateMedia({ colorScheme: "light" });
      await expect(root).toHaveAttribute("data-theme", "light");
      await page.emulateMedia({ colorScheme: "dark" });
      await expect(root).toHaveAttribute("data-theme", "dark");

      await page.getByLabel("Switch portal").click();
      await expect(page.getByLabel("GBS portals").getByText(portal.current, { exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      const expected = [
        ["Admin Portal", ADMIN_URL],
        ["Partner Portal", PARTNER_URL],
        ["Customer Portal", CUSTOMER_URL],
        ["Public Website", WEB_URL],
      ] as const;
      for (const [name, href] of expected) {
        if (name === portal.current) continue;
        await expect(page.getByLabel("GBS portals").getByRole("link", { name: new RegExp(name) }))
          .toHaveAttribute("href", href);
      }
    }
  });

  test("all protected portal roots route signed-out users to their real login screen", async ({ page }) => {
    for (const portal of [
      { url: ADMIN_URL, heading: "Admin Portal" },
      { url: PARTNER_URL, heading: "Partner Portal" },
      { url: CUSTOMER_URL, heading: "Customer Portal" },
    ]) {
      const captchaResponse = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url() === `${API_URL}/api/v1/auth/captcha`,
      );
      await page.goto(`${portal.url}/`);
      await expect(page).toHaveURL(`${portal.url}/login`);
      await expect(page.getByRole("heading", { name: portal.heading })).toBeVisible();
      expect((await captchaResponse).status()).toBe(200);
    }
  });

  test("a valid token for one role cannot open a different role portal", async ({ page, request }) => {
    const customerLogin = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: credentials.customer,
    });
    const partnerLogin = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: credentials.partner,
    });
    expect(customerLogin.status()).toBe(200);
    expect(partnerLogin.status()).toBe(200);
    const customerBody = await customerLogin.json();
    const partnerBody = await partnerLogin.json();
    const customerToken = customerBody.data?.token || customerBody.token;
    const partnerToken = partnerBody.data?.token || partnerBody.token;

    for (const attempt of [
      { loginUrl: `${ADMIN_URL}/login`, rootUrl: ADMIN_URL, key: "saas_admin_token", token: customerToken, error: "admin_access_required" },
      { loginUrl: `${PARTNER_URL}/login`, rootUrl: PARTNER_URL, key: "saas_partner_token", token: customerToken, error: "partner_access_required" },
      { loginUrl: `${CUSTOMER_URL}/login`, rootUrl: CUSTOMER_URL, key: "gbs_customer_token", token: partnerToken, error: "customer_access_required" },
    ]) {
      await page.goto(attempt.loginUrl);
      await page.evaluate(({ key, token }) => localStorage.setItem(key, token), {
        key: attempt.key,
        token: attempt.token,
      });
      await page.goto(attempt.rootUrl);
      await expect(page).toHaveURL(new RegExp(`/login\\?error=${attempt.error}$`));
      await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), attempt.key)).toBeNull();
    }
  });

  test("seeded partner login reaches live dashboard data", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const { dashboardResponse } = await loginThroughPortalUi(page, "partner", {
      dashboardResponsePath: "/api/v1/partner/dashboard-metrics",
    });
    expect(dashboardResponse?.status()).toBe(200);

    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await expect(page.getByRole("dialog", { name: "Partner global search" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search the partner portal" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Partner global search" })).toBeHidden();
    expectRuntimeHealthy(runtimeErrors);
  });

  test("seeded customer login reaches live dashboard data", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const { dashboardResponse } = await loginThroughPortalUi(page, "customer", {
      dashboardResponsePath: "/api/v1/customer/dashboard-summary",
    });
    expect(dashboardResponse?.status()).toBe(200);
    for (const [route, heading] of [
      ["review-requests", "Review requests"],
      ["google-media", "Google media"],
      ["my-plan", "My plan"],
      ["marketing-tracker", "Marketing tracker"],
    ] as const) {
      const response = await page.goto(`${CUSTOMER_URL}/${route}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect(page.getByLabel("Customer portal navigation")).toHaveCount(1);
    }
    expectRuntimeHealthy(runtimeErrors);
  });

  test("public portal renders and links back to all product portals", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    const response = await page.goto(`${WEB_URL}/portals`);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "GBS Portals & Applications Hub" }),
    ).toBeVisible();

    for (const [name, href] of [
      ["Open Admin Portal", ADMIN_URL],
      ["Open Partner Portal", PARTNER_URL],
      ["Open Customer Portal", CUSTOMER_URL],
    ] as const) {
      await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveAttribute(
        "href",
        href,
      );
    }
    expectRuntimeHealthy(runtimeErrors);
  });

  test("public contact form verifies CAPTCHA and creates a real tenant lead", async ({ page, request }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.goto(`${WEB_URL}/contact`);

    const captchaResponse = page.waitForResponse(
      (response) => response.request().method() === "GET" && response.url() === `${API_URL}/api/v1/auth/captcha`,
    );
    await page.getByRole("button", { name: "Refresh CAPTCHA" }).click();
    expect((await captchaResponse).status()).toBe(200);

    await page.getByLabel("CAPTCHA code").fill(process.env.GBS_E2E_CAPTCHA_TOKEN || "gbs-playwright-captcha");
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByText("CAPTCHA verified successfully.")).toBeVisible();

    const email = `playwright-contact-${Date.now()}@example.com`;
    await page.getByLabel("Full Name").fill("Playwright Contact");
    await page.getByLabel("Work Email").fill(email);
    await page.getByLabel("Organization / Agency").fill("GBS Browser QA");
    await page.getByLabel("Message / Requirements").fill("Validate the real public lead workflow.");

    const leadResponsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url() === `${API_URL}/api/v1/leads`,
    );
    await page.getByRole("button", { name: "Submit Demo Request" }).click();
    const leadResponse = await leadResponsePromise;
    expect(leadResponse.status()).toBe(201);
    const lead = await leadResponse.json();
    await expect(page.getByText(/registered/i)).toBeVisible();

    // Remove the test lead through the same authenticated, tenant-scoped API.
    const partnerLogin = await request.post(`${API_URL}/api/v1/auth/login`, { data: credentials.partner });
    const partnerBody = await partnerLogin.json();
    const partnerToken = partnerBody.data?.token || partnerBody.token;
    const cleanup = await request.delete(`${API_URL}/api/v1/clients/${lead.leadId}`, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });
    expect(cleanup.status()).toBe(200);
    expectRuntimeHealthy(runtimeErrors);
  });
});

test.describe("mobile login responsiveness", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("all portal login forms and the public homepage fit a phone viewport", async ({ page }) => {
    for (const url of [
      `${ADMIN_URL}/login`,
      `${PARTNER_URL}/login`,
      `${CUSTOMER_URL}/login`,
      `${WEB_URL}/`,
    ]) {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
});
