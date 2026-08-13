const fs = require("node:fs");
const path = require("node:path");

describe("Customer Mobile secondary data honesty", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "App.tsx"), "utf8");

  it("does not reintroduce sample records, invented metrics, or simulated native success", () => {
    const forbiddenFixtures = [
      "PLATINUM",
      "42 Orders",
      "18 Bookings",
      "5.0 / 5.0",
      "4.9 ⭐ Rating",
      "Special Holiday Offer",
      "20% off",
      "Auto-renews Sept 1",
      "ORD-9482",
      "ORD-9483",
      "TRK-88492019",
      "Monthly Strategy Sync",
      "Tomorrow @ 2:00 PM",
      "Sarah Jenkins",
      "Master Services Agreement 2026.pdf",
      "Invoice_INV-2026-08.pdf",
      "INV-9402",
      "$120.00",
      "Auto-pay Active",
      "Expected callback: Within 2 hours",
      "Completed Aug 5",
      "items queued for auto-sync",
    ];

    for (const fixture of forbiddenFixtures) expect(source).not.toContain(fixture);
  });

  it("keeps honest portal handoffs for unavailable mobile views", () => {
    expect(source).toContain("Order and tracking records are not loaded into the native app.");
    expect(source).toContain("No payment can be completed in this view.");
    expect(source).toContain('openCustomerPortal("/payments")');
  });
});
