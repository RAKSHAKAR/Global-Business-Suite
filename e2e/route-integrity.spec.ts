import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  ADMIN_URL,
  CUSTOMER_URL,
  PARTNER_URL,
  WEB_URL,
} from "./helpers/environment";

const portalRoutes = {
  admin: {
    baseUrl: ADMIN_URL,
    routes: [
      "/", "/ai-agents", "/ai-governance", "/ai-knowledge", "/ai-marketplace",
      "/ai-prompts", "/ai-providers", "/ai-workflows", "/analytics",
      "/api-integrations", "/approval-workflows", "/audit-logs", "/billing",
      "/booking-providers", "/branding", "/call-providers", "/compliance-rules",
      "/crm", "/cron", "/customer-success", "/developer-portal", "/downloads",
      "/enterprise-copilot", "/feature-flags", "/file-manager", "/forgot-password",
      "/future-readiness", "/gbp-studio", "/global-search", "/inbox-providers",
      "/leads", "/license-management", "/login", "/low-code", "/marketing",
      "/marketplace", "/notifications", "/organizations", "/platform-control",
      "/reports", "/reset-password", "/roles", "/role-simulator", "/settings",
      "/settings/iam", "/settings/security", "/social-channels", "/social-studio",
      "/tenants", "/users", "/whitelabel-settings", "/workflow-builder",
    ],
  },
  partner: {
    baseUrl: PARTNER_URL,
    routes: [
      "/", "/ai-assistant", "/ai-studio", "/analytics", "/appointments",
      "/business-profile", "/calendar-tasks", "/call-center", "/compliance-reports",
      "/crm", "/customers", "/files", "/forgot-password", "/gbp", "/login",
      "/marketing", "/marketplace", "/notifications", "/register", "/reports",
      "/reset-password", "/settings", "/settings/security", "/social", "/team",
      "/unified-inbox", "/verify-email", "/verify-mobile", "/whitelabel-branding",
      "/workflows",
    ],
  },
  customer: {
    baseUrl: CUSTOMER_URL,
    routes: [
      "/", "/account", "/ai-assistant", "/ai-faq", "/ai-poster", "/appointments",
      "/calendar", "/call-requests", "/copilot", "/documents", "/feedback",
      "/forgot-password", "/gbp", "/google-media", "/inbox", "/login",
      "/marketing-tracker", "/messages", "/my-plan", "/notifications",
      "/orders", "/payments", "/performance", "/profile", "/register", "/reports", "/review-requests",
      "/reset-password", "/reviews", "/score", "/services", "/settings",
      "/settings/security", "/social", "/support", "/verify-email", "/verify-mobile",
      "/workflows",
    ],
  },
  web: {
    baseUrl: WEB_URL,
    routes: [
      "/", "/about", "/careers", "/contact", "/features", "/portals", "/pricing",
      "/privacy", "/security", "/solutions", "/terms",
    ],
  },
} as const;

const portalSourceRoots = {
  admin: path.resolve("apps/admin-portal/app"),
  partner: path.resolve("apps/partner-portal/app"),
  customer: path.resolve("apps/customer-portal/src/app"),
  web: path.resolve("apps/web-portal/src/app"),
} as const;

function literalAppLinks(root: string): string[] {
  const discovered = new Set<string>();
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (/\.(?:tsx|ts|jsx|js)$/.test(entry.name)) {
        const source = fs.readFileSync(entryPath, "utf8");
        for (const match of source.matchAll(/\bhref\s*=\s*["'](\/[^"']*)["']/g)) {
          const pathname = match[1].split(/[?#]/, 1)[0] || "/";
          if (!pathname.startsWith("/api/") && !pathname.includes("${")) discovered.add(pathname);
        }
      }
    }
  };
  visit(root);
  return [...discovered].sort();
}

for (const [portalName, portal] of Object.entries(portalRoutes)) {
  test(`${portalName} portal has no missing or server-error static routes`, async ({ request }) => {
    test.setTimeout(240_000);

    for (const route of portal.routes) {
      await test.step(route, async () => {
        const response = await request.get(`${portal.baseUrl}${route}`, {
          failOnStatusCode: false,
          maxRedirects: 5,
          timeout: 45_000,
        });
        const status = response.status();
        expect.soft(
          status,
          `${portalName} ${route} returned HTTP ${status}`,
        ).toBeGreaterThanOrEqual(200);
        expect.soft(
          status,
          `${portalName} ${route} returned HTTP ${status}`,
        ).toBeLessThan(400);

        const contentType = response.headers()["content-type"] || "";
        if (contentType.includes("text/html")) {
          const html = await response.text();
          expect.soft(html, `${portalName} ${route} rendered Next.js not-found UI`).not.toContain(
            "This page could not be found",
          );
          expect.soft(html, `${portalName} ${route} rendered a framework error overlay`).not.toContain(
            "nextjs-container-errors-header",
          );
        }
      });
    }
  });

  test(`${portalName} literal in-product links resolve instead of silently drifting`, async ({ request }) => {
    const links = literalAppLinks(portalSourceRoots[portalName as keyof typeof portalSourceRoots]);
    expect(links.length, `${portalName} source scan should discover links`).toBeGreaterThan(0);
    for (const route of links) {
      const response = await request.get(`${portal.baseUrl}${route}`, {
        failOnStatusCode: false,
        maxRedirects: 5,
        timeout: 45_000,
      });
      expect.soft(response.status(), `${portalName} source link ${route} returned ${response.status()}`).toBeLessThan(400);
    }
  });
}
