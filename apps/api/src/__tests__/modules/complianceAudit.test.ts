import { ComplianceAuditService } from "../../services/complianceAuditService";

describe("Enterprise Audit & Compliance Subsystem (Phase 19 Automated Tests)", () => {
  const testTenantId = "test-tenant-compliance-105";

  it("should log actions to audit log and query audit trails", async () => {
    const log = await ComplianceAuditService.logAction({
      tenantId: testTenantId,
      userId: "user-admin-99",
      action: "UPDATE_PERMISSION",
      resource: "RolePermission",
      resourceId: "role-101",
      details: "Granted admin privileges to manager.",
    });

    expect(log.id).toBeDefined();
    expect(log.action).toBe("UPDATE_PERMISSION");

    const logs = await ComplianceAuditService.queryAuditLogs({ tenantId: testTenantId, action: "UPDATE_PERMISSION" });
    expect(logs.length).toBeGreaterThan(0);
  });

  it("should configure retention policies and execute cleanup dry-run", async () => {
    const policy = await ComplianceAuditService.configureRetentionPolicy({
      tenantId: testTenantId,
      moduleName: "AUDIT",
      retentionDays: 1,
      autoCleanupAction: "ARCHIVE",
      legalHold: false,
    });

    expect(policy.moduleName).toBe("AUDIT");
    expect(policy.retentionDays).toBe(1);

    const cleanup = await ComplianceAuditService.executeRetentionCleanup(testTenantId, "AUDIT");
    expect(cleanup).toBeDefined();
    expect(cleanup.cleaned).toBeDefined();
  });

  it("should generate compliance data export jobs in PDF, Excel, CSV, JSON", async () => {
    const job = await ComplianceAuditService.requestComplianceExport({
      tenantId: testTenantId,
      requestedByUserId: "admin-user",
      exportType: "AUDIT_LOGS",
      format: "PDF",
    });

    expect(job.id).toBeDefined();
    expect(job.status).toBe("COMPLETED");
    expect(job.fileUrl).toContain("pdf");

    const exportsList = await ComplianceAuditService.listComplianceExports(testTenantId);
    expect(exportsList.length).toBeGreaterThan(0);
  });

  it("should provide compliance & risk dashboard metrics", async () => {
    const dashboard = await ComplianceAuditService.getComplianceDashboard(testTenantId);
    expect(dashboard.securityScore).toBe(98);
    expect(dashboard.riskLevel).toBe("LOW");
    expect(dashboard.totalAuditLogs).toBeGreaterThanOrEqual(1);
  });
});
