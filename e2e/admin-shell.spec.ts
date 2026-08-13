import { expect, test, type Page } from "@playwright/test";
import { ADMIN_URL } from "./helpers/environment";
import {
  collectRuntimeErrors,
  expectNoHorizontalOverflow,
  expectRuntimeHealthy,
} from "./helpers/runtime";

const PREFERENCES_KEY = "gbs-admin-preferences:v1";
const SIDEBAR_KEY = "gbs-admin-sidebar:v1";

async function openDashboard(page: Page) {
  await page.goto(`${ADMIN_URL}/`);
  await expect(page).toHaveURL(new RegExp(`^${ADMIN_URL}/?$`));
  await expect(
    page.getByRole("heading", { name: "Enterprise Admin Control Center" }),
  ).toBeVisible();
}

async function dashboardGeometry(page: Page) {
  return page.evaluate(() => {
    const banner = document.querySelector<HTMLElement>(".gbs-dashboard-banner");
    const main = document.querySelector<HTMLElement>(".gbs-dashboard-main");
    const rail = document.querySelector<HTMLElement>(".gbs-dashboard-rail");
    const firstCard = document.querySelector<HTMLElement>(".gbs-dashboard-main > div");
    if (!banner || !main || !rail || !firstCard) {
      throw new Error("Dashboard geometry targets were not rendered");
    }

    const rect = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        bottom: Math.round(box.bottom),
      };
    };

    return {
      banner: rect(banner),
      main: rect(main),
      rail: rect(rail),
      dashboardColumns: getComputedStyle(
        document.querySelector<HTMLElement>(".gbs-admin-dashboard")!,
      ).gridTemplateColumns,
      railDisplay: getComputedStyle(rail).display,
      firstCardPadding: getComputedStyle(firstCard).padding,
    };
  });
}

test.describe("admin shell interactions", () => {
  test("theme controls change computed colors and persist across reload", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);
    await openDashboard(page);

    const root = page.locator("html");
    const content = page.getByTestId("admin-content");
    const banner = page.locator(".gbs-dashboard-banner");
    const darkColors = {
      content: await content.evaluate((node) => getComputedStyle(node).backgroundColor),
      banner: await banner.evaluate((node) => getComputedStyle(node).backgroundColor),
    };

    await page.getByRole("button", { name: "Use light theme" }).click();
    await expect(root).toHaveAttribute("data-theme", "light");
    await expect(root).toHaveAttribute("data-theme-preference", "light");
    await expect(page.getByRole("button", { name: "Use light theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const lightColors = {
      content: await content.evaluate((node) => getComputedStyle(node).backgroundColor),
      banner: await banner.evaluate((node) => getComputedStyle(node).backgroundColor),
    };
    expect(lightColors.content).not.toBe(darkColors.content);
    expect(lightColors.banner).not.toBe(darkColors.banner);
    expect(lightColors.content).toBe("rgb(248, 250, 252)");
    expect(lightColors.banner).toBe("rgb(255, 255, 255)");

    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw).themeMode : null;
        }, PREFERENCES_KEY),
      )
      .toBe("light");

    await page.reload();
    await expect(root).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Use light theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(root).toHaveAttribute("data-theme", "dark");
    await expect(content).not.toHaveCSS("background-color", "rgb(248, 250, 252)");
    expectRuntimeHealthy(runtimeErrors);
  });

  test("all three layouts have distinct geometry and the selected layout persists", async ({ page }) => {
    await openDashboard(page);
    await expect(page.locator("html")).toHaveAttribute("data-dashboard-layout", "1");

    const layoutOne = await dashboardGeometry(page);
    expect(layoutOne.rail.x).toBeGreaterThan(layoutOne.banner.x + layoutOne.banner.width);
    expect(Math.abs(layoutOne.rail.y - layoutOne.banner.y)).toBeLessThanOrEqual(2);

    await page.getByRole("button", { name: "Use dashboard layout 2" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-dashboard-layout", "2");
    const layoutTwo = await dashboardGeometry(page);
    expect(layoutTwo.rail.x).toBeGreaterThan(layoutTwo.banner.x + layoutTwo.banner.width);
    expect(layoutTwo.rail.width).toBeLessThan(layoutOne.rail.width);
    expect(layoutTwo.firstCardPadding).not.toBe(layoutOne.firstCardPadding);
    expect(layoutTwo.dashboardColumns).not.toBe(layoutOne.dashboardColumns);

    await page.getByRole("button", { name: "Use dashboard layout 3" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-dashboard-layout", "3");
    const layoutThree = await dashboardGeometry(page);
    expect(Math.abs(layoutThree.rail.x - layoutThree.main.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(layoutThree.rail.width - layoutThree.main.width)).toBeLessThanOrEqual(2);
    expect(layoutThree.rail.y).toBeGreaterThanOrEqual(layoutThree.main.bottom);
    expect(layoutThree.railDisplay).toBe("grid");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-dashboard-layout", "3");
    await expect(page.getByRole("button", { name: "Use dashboard layout 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const persisted = await dashboardGeometry(page);
    expect(Math.abs(persisted.rail.x - persisted.main.x)).toBeLessThanOrEqual(2);
  });

  test("Ctrl or Command plus K supports Escape, focus restoration, and keyboard navigation", async ({ page }) => {
    await openDashboard(page);
    const themeToggle = page.getByRole("button", { name: /Switch to (?:light|dark) theme/ });
    await themeToggle.focus();

    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    const dialog = page.getByRole("dialog", { name: "Global command palette" });
    const search = page.getByRole("searchbox");
    await expect(dialog).toBeVisible();
    await expect(search).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(themeToggle).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");

    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await search.fill("Global Users");
    await expect(page.getByRole("option", { name: /Global Users/ })).toBeVisible();
    await search.press("Enter");
    await expect(page).toHaveURL(`${ADMIN_URL}/users`);
    await expect(page.locator("body")).not.toContainText("This page could not be found");
  });

  test("sidebar collapse updates both sidebar width and content offset and persists", async ({ page }) => {
    await openDashboard(page);
    const sidebar = page.getByTestId("admin-sidebar");
    const content = page.getByTestId("admin-content");

    const before = await Promise.all([sidebar.boundingBox(), content.boundingBox()]);
    expect(before[0]?.width).toBeGreaterThan(220);
    expect(before[1]?.x).toBeGreaterThan(220);

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect
      .poll(async () => ({
        sidebarWidth: Math.round((await sidebar.boundingBox())?.width || 0),
        contentX: Math.round((await content.boundingBox())?.x || 0),
      }))
      .toEqual({ sidebarWidth: 64, contentX: 64 });
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), SIDEBAR_KEY))
      .toBe("collapsed");

    await page.reload();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await expect
      .poll(async () => ({
        sidebarWidth: Math.round((await sidebar.boundingBox())?.width || 0),
        contentX: Math.round((await content.boundingBox())?.x || 0),
      }))
      .toEqual({ sidebarWidth: 64, contentX: 64 });
  });

  test("header exposes working links to every other web portal", async ({ page }) => {
    await openDashboard(page);
    await page.getByRole("button", { name: "Open services and portals" }).click();
    await expect(page.getByRole("menu")).toBeVisible();

    const expectedLinks = [
      ["Partner Portal", "http://localhost:3001"],
      ["Customer Portal", "http://localhost:3002"],
      ["Public Website", "http://localhost:3003"],
    ] as const;

    for (const [name, href] of expectedLinks) {
      const link = page.getByRole("link", { name: new RegExp(name) });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAttribute("target", "_blank");
    }
  });
});

test.describe("admin responsive shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile dashboard has no horizontal overflow and uses mobile navigation", async ({ page }) => {
    await openDashboard(page);
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId("admin-sidebar")).toBeHidden();
    await expect(page.getByRole("button", { name: "Open all admin navigation" })).toBeVisible();
  });
});
