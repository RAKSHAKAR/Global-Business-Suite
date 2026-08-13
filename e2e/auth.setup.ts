import { test as setup } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { ADMIN_AUTH_STATE } from "./helpers/environment";

setup("authenticate the seeded administrator through the real CAPTCHA flow", async ({ page }) => {
  await loginAsAdmin(page);
  await page.context().storageState({ path: ADMIN_AUTH_STATE });
});
