import fs from "node:fs";
import path from "node:path";

describe("admin dashboard telemetry integrity", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "routes", "v1", "adminDashboard.ts"),
    "utf8",
  );

  it("does not contain screenshot-only production metrics", () => {
    for (const demoValue of [
      "1.42M",
      "99.98%",
      "12,540",
      "48,500",
      "1420500",
      "All systems operational",
    ]) {
      expect(source).not.toContain(demoValue);
    }
  });

  it("uses the requested range and database models for dashboard values", () => {
    expect(source).toContain('requirePermission("settings", "read", "GLOBAL")');
    expect(source).toContain("resolveDashboardRange(req.query.range)");
    expect(source).toContain("db.payment.findMany");
    expect(source).toContain("db.aiUsageLog.aggregate");
    expect(source).toContain("db.backgroundJobQueue.groupBy");
    expect(source).toContain("db.auditLog.findMany");
  });

  it("fails without returning fallback widgets when telemetry queries fail", () => {
    const failureHandler = source.slice(
      source.indexOf('console.error("[adminDashboard:widgets]"'),
      source.indexOf("// GET /api/v1/admin/dashboard/layout"),
    );

    expect(failureHandler).toContain("DASHBOARD_TELEMETRY_UNAVAILABLE");
    expect(failureHandler).not.toContain("widgetsData");
    expect(failureHandler).not.toContain("widgets:");
  });
});
