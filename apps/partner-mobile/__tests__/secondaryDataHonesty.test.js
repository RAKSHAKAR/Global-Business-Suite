const fs = require("node:fs");
const path = require("node:path");

describe("Partner Mobile secondary data honesty", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "App.tsx"), "utf8");

  it("does not reintroduce sample records, invented metrics, or simulated native success", () => {
    const forbiddenFixtures = [
      "94.4%",
      "64 hrs/mo",
      "2 Verified Locations",
      "14 pending reviews",
      "13 Social Networks",
      "2 Unread",
      "312 Active Leads",
      "14.8%",
      "Review Monthly SEO Audit",
      "Maria G.",
      "@techwave",
      "John D.",
      "+1-555-842-0198",
      "Alice Smith",
      "Bob Chen",
      "Carol White",
      "12 Calls",
      "4.2 min",
      "3 upcoming appointments",
      "changes will auto-sync when online",
      "High Value CRM Leads",
    ];

    for (const fixture of forbiddenFixtures) expect(source).not.toContain(fixture);
  });

  it("keeps honest portal handoffs for unavailable mobile views", () => {
    expect(source).toContain("Task records are not loaded into the native app.");
    expect(source).toContain("Camera scanning and lead extraction are not configured");
    expect(source).toContain('openPartnerPortal("/call-center")');
  });
});
