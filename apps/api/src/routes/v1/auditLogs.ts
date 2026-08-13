import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";

const router = Router();

// GET /api/v1/audit-logs - Search and filter audit logs
router.get(
  "/",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1")));
      const limit = Math.min(100, parseInt(String(req.query.limit || "50")));
      const { action, resource, userId, tenantId } = req.query;

      const where: any = {};
      if (action) where.action = String(action);
      if (resource) where.resource = String(resource);
      if (userId) where.userId = String(userId);
      if (tenantId) where.tenantId = String(tenantId);

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("[auditLogs:list]", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  },
);

// GET /api/v1/audit-logs/export - Export audit logs to CSV
router.get(
  "/export",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 1000,
        orderBy: { createdAt: "desc" },
      });

      let csv =
        "ID,Timestamp,TenantID,UserID,Action,Resource,ResourceID,IPAddress,UserAgent\n";
      logs.forEach((log) => {
        const line = [
          log.id,
          log.createdAt.toISOString(),
          log.tenantId || "",
          log.userId || "",
          `"${log.action || ""}"`,
          `"${log.resource || ""}"`,
          log.resourceId || "",
          log.ipAddress || "",
          `"${(log.userAgent || "").replace(/"/g, '""')}"`,
        ].join(",");
        csv += line + "\n";
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="audit_logs.csv"',
      );
      res.status(200).send(csv);
    } catch (error) {
      console.error("[auditLogs:export]", error);
      res.status(500).json({ error: "Failed to export audit logs" });
    }
  },
);

export default router;
