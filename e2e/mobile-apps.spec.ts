import { expect, test } from "@playwright/test";
import {
  ADMIN_MOBILE_URL,
  CUSTOMER_MOBILE_URL,
  PARTNER_MOBILE_URL,
  credentials,
} from "./helpers/environment";
import {
  collectRuntimeErrors,
  expectNoHorizontalOverflow,
  expectRuntimeHealthy,
} from "./helpers/runtime";

const THEME_STORAGE_KEY = "gbs.mobile.theme:v1";

const apps = [
  {
    name: "Admin",
    url: ADMIN_MOBILE_URL,
    emailPlaceholder: "Admin Email (admin@enterprise.com)",
    passwordPlaceholder: "Password",
    signInName: "Sign In to Admin Portal",
    navigationName: "Admin app navigation",
    portalLinkName: "Open Admin Web Portal",
    credentials: credentials.admin,
  },
  {
    name: "Partner",
    url: PARTNER_MOBILE_URL,
    emailPlaceholder: "Business Email (partner@tenant.com)",
    passwordPlaceholder: "Password",
    signInName: "Sign In",
    navigationName: "Partner app navigation",
    portalLinkName: "Open Partner Web Portal",
    credentials: credentials.partner,
  },
  {
    name: "Customer",
    url: CUSTOMER_MOBILE_URL,
    emailPlaceholder: "Email address",
    passwordPlaceholder: "Password",
    signInName: "Sign In",
    navigationName: "Customer app navigation",
    portalLinkName: "Open Customer Web Portal",
    credentials: credentials.customer,
  },
] as const;

for (const mobileApp of apps) {
  test(`${mobileApp.name} mobile web persists theme, authenticates, and renders navigation`, async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await page.goto(mobileApp.url);
    await expect(page.getByTestId("theme-mode-control")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect(page.getByLabel(mobileApp.portalLinkName)).toBeVisible();

    const themeControl = page.getByTestId("theme-mode-control");
    await expect(themeControl).toHaveAttribute("aria-label", /Theme mode: (System|Light|Dark)/);
    for (let attempts = 0; attempts < 3; attempts += 1) {
      if ((await themeControl.getAttribute("aria-label")) === "Theme mode: Dark") break;
      await themeControl.click();
    }
    await expect(themeControl).toHaveAttribute("aria-label", "Theme mode: Dark");
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw).mode : null;
        }, THEME_STORAGE_KEY),
      )
      .toBe("dark");

    await page.reload();
    await expect(page.getByTestId("theme-mode-control")).toHaveAttribute(
      "aria-label",
      "Theme mode: Dark",
    );
    await expectNoHorizontalOverflow(page);

    await page.getByPlaceholder(mobileApp.emailPlaceholder).fill(mobileApp.credentials.email);
    await page.getByPlaceholder(mobileApp.passwordPlaceholder).fill(mobileApp.credentials.password);
    await page.getByLabel(mobileApp.signInName, { exact: true }).click();
    await expect(page.getByLabel(mobileApp.navigationName)).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByLabel(mobileApp.navigationName)).toBeVisible({ timeout: 20_000 });
    await page.getByLabel(/Settings$/i).click();
    await page.getByLabel("Sign Out / Logout", { exact: true }).click();
    await expect(page.getByPlaceholder(mobileApp.emailPlaceholder)).toBeVisible();
    await page.reload();
    await expect(page.getByPlaceholder(mobileApp.emailPlaceholder)).toBeVisible();
    expectRuntimeHealthy(runtimeErrors);
  });
}
