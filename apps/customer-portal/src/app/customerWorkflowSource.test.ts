import { readFileSync } from "node:fs";
import { join } from "node:path";

const routeNames = ["account", "orders", "services", "support", "documents", "messages"] as const;

function readRoute(route: (typeof routeNames)[number]) {
  return readFileSync(join(process.cwd(), "src", "app", route, "page.tsx"), "utf8");
}

describe("customer workflow source regressions", () => {
  const sources = Object.fromEntries(routeNames.map((route) => [route, readRoute(route)]));

  it.each(routeNames)("keeps %s free of browser fake-success dialogs", (route) => {
    expect(sources[route]).not.toMatch(/\b(?:window\.)?(?:alert|prompt)\s*\(/);
    expect(sources[route]).not.toContain("window.location.reload");
  });

  it("does not call unsupported invoice, service-change, or CRM-signing workflows", () => {
    const combinedSource = Object.values(sources).join("\n");
    expect(combinedSource).not.toContain("/api/v1/customer/services/request");
    expect(combinedSource).not.toContain("/api/v1/crm/documents/");
    expect(sources.orders).toContain("Invoice unavailable");
    expect(sources.services).toContain("approval workflows are not configured");
    expect(sources.documents).toContain("Digital signing unavailable");
  });

  it("retains the supported account, ticket, document-link, and live-chat contracts", () => {
    expect(sources.account).toContain('href="/settings/security"');
    expect(sources.account).toContain("/api/v1/iam/devices/");
    expect(sources.support).toContain("/api/v1/customer/support/tickets");
    expect(sources.support).toContain("submittingRef.current");
    expect(sources.documents).toContain("/api/v1/customer/documents/upload");
    expect(sources.documents).toContain("savingRef.current");
    expect(sources.messages).toContain('channel: "LIVE_CHAT"');
    expect(sources.messages).toContain("sendingRef.current");
  });
});
