import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Partner dashboard production-data contract", () => {
  const pageSource = readFileSync(resolve(__dirname, "../app/page.tsx"), "utf8");
  const workflowsSource = readFileSync(resolve(__dirname, "../app/workflows/page.tsx"), "utf8");
  const teamSource = readFileSync(resolve(__dirname, "../app/team/page.tsx"), "utf8");
  const serviceSource = readFileSync(
    resolve(__dirname, "../../api/src/services/partnerPortalService.ts"),
    "utf8",
  );
  const routeSource = readFileSync(resolve(__dirname, "../../api/src/routes/v1/partnerPortal.ts"), "utf8");
  const dashboardService = serviceSource.slice(
    serviceSource.indexOf("static async getDashboardMetrics"),
    serviceSource.indexOf("// 2. Business Profile"),
  );
  const invitationService = serviceSource.slice(
    serviceSource.indexOf("static async inviteTeamMember"),
    serviceSource.indexOf("static async updateMemberStatus"),
  );

  it("does not ship the known fabricated dashboard values or fallback expressions", () => {
    const bannedFragments = [
      "14,500",
      "14500.0",
      "48.2k",
      "8 Platforms Connected",
      "98.5%",
      "Quota: Unlimited",
      "SLA: On Track",
      "28 days",
      "metrics?.avgRating ||",
      "metrics?.monthlyRevenue ||",
      "impressions: 4200",
    ];
    for (const fragment of bannedFragments) {
      expect(pageSource).not.toContain(fragment);
      expect(dashboardService).not.toContain(fragment);
    }
  });

  it("uses the authenticated metrics API, database trend, nullable values, and Blob CSV", () => {
    expect(pageSource).toContain("/api/v1/partner/dashboard-metrics");
    expect(pageSource).toContain("metrics.activityTrend");
    expect(pageSource).toContain("metrics.avgRating === null");
    expect(pageSource).toContain("metrics.subscription ?");
    expect(pageSource).toContain("new Blob([contents]");
    expect(dashboardService).toContain('dataSource: "DATABASE"');
    expect(dashboardService).toContain("paidRevenueLast30DaysUSD");
    expect(dashboardService).not.toContain("ensureTenant(tenantId)");
  });

  it("renders only persisted workflows and routes social approval review to the safe screen", () => {
    expect(workflowsSource).not.toContain("Auto AI Review Reply");
    expect(workflowsSource).not.toContain("Marketing Team");
    expect(workflowsSource).not.toContain(">Approve<");
    expect(workflowsSource).toContain("data.automationRules.map");
    expect(workflowsSource).toContain("data.approvalRequests.map");
    expect(workflowsSource).toContain('href="/social"');
    expect(workflowsSource).toContain("No pending approval requests are recorded");
  });

  it("uses secure persisted invitations and never claims unconfirmed delivery", () => {
    expect(teamSource).not.toContain("alert(");
    expect(teamSource).not.toContain("Invitation dispatched");
    expect(teamSource).toContain("pendingInvitations");
    expect(teamSource).toContain("deliveryStatus");
    expect(invitationService).toContain("randomBytes(32)");
    expect(invitationService).not.toContain("Math.random");
    expect(invitationService).toContain("TEAM_INVITE_DELIVERY_WEBHOOK_URL");
    expect(invitationService).toContain("TEAM_INVITATION_CREATED");
    expect(invitationService).toContain('"NOT_CONFIGURED"');
    expect(routeSource).toContain('post("/team/invite", requirePermission("clients", "manage")');
    expect(routeSource).toContain('put("/team/:id/status", requirePermission("clients", "manage")');
  });
});
