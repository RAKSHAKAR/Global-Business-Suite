const fs = require("node:fs");
const path = require("node:path");

describe("Admin Mobile secondary data honesty", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "App.tsx"), "utf8");

  it("does not reintroduce sample records, invented metrics, or simulated native success", () => {
    const forbiddenFixtures = [
      "$1,542,000",
      "1.8%",
      "34.2%",
      "4.8 ★",
      "Acme Enterprise Corp",
      "Global Logistics LLC",
      "Apex Health Systems",
      "Users: 450",
      "Gemini 3.6 Flash",
      "Connected Accounts: 128",
      "Reviews Analyzed: 14,200",
      "Passed ✓",
      "Enforced ✓",
      "Acme Corp Licensing Deal",
      "AI Score: 88/100",
      "$45,000",
      "$120,000",
      "Installed Plugins: 24",
      "Query Engine: Ready",
      "Inbox Channels: 10 Active",
      "actions queued for auto-sync",
      "System Tenant Health",
    ];

    for (const fixture of forbiddenFixtures) expect(source).not.toContain(fixture);
  });

  it("keeps honest portal handoffs for unavailable mobile views", () => {
    expect(source).toContain("Analytics reports are not loaded into the native app.");
    expect(source).toContain("Camera capture and document indexing are not configured");
    expect(source).toContain('openAdminPortal("/settings/security")');
  });
});
