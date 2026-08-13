import { Router, Request, Response } from "express";
import { ComplianceAuditService } from "../../services/complianceAuditService";

export const complianceAuditRouter = Router();

// GET /api/v1/compliance/audit-logs
complianceAuditRouter.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string);
    const userId = req.query.userId as string;
    const action = req.query.action as string;
    const resource = req.query.resource as string;

    const logs = await ComplianceAuditService.queryAuditLogs({ tenantId, userId, action, resource });
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/compliance/audit-logs
complianceAuditRouter.post("/audit-logs", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string);
    const log = await ComplianceAuditService.logAction({ ...req.body, tenantId });
    res.status(201).json({ success: true, data: log });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/compliance/retention-policies
complianceAuditRouter.get("/retention-policies", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string);
    const policies = await ComplianceAuditService.listRetentionPolicies(tenantId);
    res.json({ success: true, count: policies.length, data: policies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/compliance/retention-policies
complianceAuditRouter.post("/retention-policies", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string);
    const policy = await ComplianceAuditService.configureRetentionPolicy({ ...req.body, tenantId });
    res.json({ success: true, data: policy });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/compliance/retention-cleanup
complianceAuditRouter.post("/retention-cleanup", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const moduleName = req.body.moduleName || "AUDIT";

    const result = await ComplianceAuditService.executeRetentionCleanup(tenantId, moduleName);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/compliance/export
complianceAuditRouter.post("/export", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const requestedByUserId = req.body.requestedByUserId || "system-admin";
    const { exportType, format, dateRangeStart, dateRangeEnd } = req.body;

    const job = await ComplianceAuditService.requestComplianceExport({
      tenantId,
      requestedByUserId,
      exportType: exportType || "AUDIT_LOGS",
      format: format || "PDF",
      dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : undefined,
      dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : undefined,
    });

    res.status(201).json({ success: true, data: job });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/compliance/dashboard
complianceAuditRouter.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const dashboard = await ComplianceAuditService.getComplianceDashboard(tenantId);
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
