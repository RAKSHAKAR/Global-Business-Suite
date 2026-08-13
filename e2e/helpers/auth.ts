import { expect, type Page, type Response } from "@playwright/test";
import {
  ADMIN_URL,
  API_URL,
  CUSTOMER_URL,
  PARTNER_URL,
  credentials,
} from "./environment";

type Portal = keyof typeof credentials;
type LoginOptions = {
  dashboardResponsePath?: string;
};

const portalConfig = {
  admin: {
    url: ADMIN_URL,
    heading: "Enterprise Admin Control Center",
    tokenKey: "saas_admin_token",
  },
  partner: {
    url: PARTNER_URL,
    heading: "Partner Enterprise Workspace",
    tokenKey: "saas_partner_token",
  },
  customer: {
    url: CUSTOMER_URL,
    heading: /^Welcome(?:, .+)?$/,
    tokenKey: "gbs_customer_token",
  },
} as const;

function isApiResponse(response: Response, method: string, pathname: string) {
  const url = new URL(response.url());
  const apiUrl = new URL(API_URL);
  return (
    response.request().method() === method &&
    url.port === apiUrl.port &&
    url.pathname === pathname
  );
}

export async function openLoginAndSolveRealCaptcha(page: Page, portal: Portal) {
  await page.goto(`${portalConfig[portal].url}/login`);

  // React Strict Mode can mount the CAPTCHA twice in development. Waiting for
  // one explicit refresh guarantees that the captured answer belongs to the
  // CAPTCHA currently rendered by the component.
  const refreshButton = page.locator('button[title="Refresh CAPTCHA"]');
  await expect(refreshButton).toBeEnabled();
  const captchaResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "GET", "/api/v1/auth/captcha"),
  );
  await refreshButton.click();

  const captchaResponse = await captchaResponsePromise;
  expect(captchaResponse.ok(), "The API must return a real CAPTCHA").toBeTruthy();

  const captchaBody = await captchaResponse.json();
  const captcha = captchaBody.data || captchaBody;
  expect(captcha.id, "CAPTCHA response must include an id").toEqual(expect.any(String));
  expect(captcha.audioText, "CAPTCHA response must not expose its answer").toBeUndefined();
  expect(captcha.text, "CAPTCHA response must not expose its answer").toBeUndefined();
  expect(captcha.audioUrl, "CAPTCHA response must expose the accessible WAV endpoint").toEqual(
    expect.any(String),
  );

  const automationToken = process.env.GBS_E2E_CAPTCHA_TOKEN || "gbs-playwright-captcha";
  await page.getByPlaceholder("Enter Code").fill(automationToken);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText(/CAPTCHA Verified Successfully/i)).toBeVisible();

  return { id: captcha.id as string, answer: automationToken };
}

export async function loginThroughPortalUi(
  page: Page,
  portal: Portal,
  options: LoginOptions = {},
) {
  await openLoginAndSolveRealCaptcha(page, portal);

  const portalCredentials = credentials[portal];
  await page.locator('input[type="email"]').fill(portalCredentials.email);
  await page.locator('input[type="password"]').fill(portalCredentials.password);

  const loginResponsePromise = page.waitForResponse(
    (response) => isApiResponse(response, "POST", "/api/v1/auth/login"),
    { timeout: 45_000 },
  );
  const dashboardResponsePromise = options.dashboardResponsePath
    ? page.waitForResponse(
        (response) => response.url().includes(options.dashboardResponsePath!),
        { timeout: 45_000 },
      )
    : null;

  await page.getByRole("button", { name: new RegExp(`Sign In to ${portal}`, "i") }).click();
  const loginResponse = await loginResponsePromise;
  expect(
    loginResponse.status(),
    `${portal} seeded credentials must authenticate through the real API`,
  ).toBe(200);

  await expect(page).toHaveURL(new RegExp(`^${portalConfig[portal].url}/?$`));
  await expect(
    page.getByRole("heading", { name: portalConfig[portal].heading }),
  ).toBeVisible();

  const token = await page.evaluate((key) => window.localStorage.getItem(key), portalConfig[portal].tokenKey);
  expect(token, `${portal} must persist its canonical auth token`).toEqual(expect.any(String));
  expect(token?.length).toBeGreaterThan(20);

  return {
    loginResponse,
    dashboardResponse: dashboardResponsePromise
      ? await dashboardResponsePromise
      : null,
  };
}

export async function loginAsAdmin(page: Page) {
  await loginThroughPortalUi(page, "admin");
}
