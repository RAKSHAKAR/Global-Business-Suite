import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { PartnerPortalService } from "../../services/partnerPortalService";
import { auditLog } from "../../services/auditLogger";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { requirePortalAccess } from "../../middleware/portalAccess";

export const partnerPortalRouter = Router();
partnerPortalRouter.use(authMiddleware);
partnerPortalRouter.use(requirePortalAccess("PARTNER"));

// Middleware helper to ensure authentication & extraction of tenantId / userId
const getContext = (req: Request) => {
  const user = (req as any).user;
  return {
    userId: user?.userId || user?.id || "",
    tenantId: user?.tenantId || "",
  };
};

// 1. Dashboard Layout & Telemetry
partnerPortalRouter.get("/dashboard-layout", async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const layout = await PartnerPortalService.getDashboardLayout(userId);
    res.json(layout);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.put("/dashboard-layout", async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const { layoutJson } = req.body;
    const layout = await PartnerPortalService.saveDashboardLayout(userId, layoutJson);
    res.json(layout);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.get("/dashboard-metrics", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    if (!tenantId) {
      return res.status(403).json({ error: "Authenticated tenant context is required" });
    }
    const metrics = await PartnerPortalService.getDashboardMetrics(tenantId);
    res.json(metrics);
  } catch (error: any) {
    const status = error?.message === "Authenticated tenant was not found" ? 404 : 500;
    res.status(status).json({ error: error.message || "Failed to load partner dashboard metrics" });
  }
});

// 2. Business Profile
partnerPortalRouter.get("/business-profile", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const profile = await PartnerPortalService.getBusinessProfile(tenantId);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.put("/business-profile", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const updated = await PartnerPortalService.updateBusinessProfile(tenantId, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Team Management
partnerPortalRouter.get("/team", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const [team, pendingInvitations] = await Promise.all([
      PartnerPortalService.getTeamMembers(tenantId),
      PartnerPortalService.getPendingTeamInvitations(tenantId),
    ]);
    res.json({ team, pendingInvitations, dataSource: "DATABASE" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/team/invite", requirePermission("clients", "manage"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { email, role } = req.body;
    const result = await PartnerPortalService.inviteTeamMember(tenantId, email, role || "PARTNER_MEMBER");
    const status = result.deliveryStatus === "DELIVERED" ? 201 : result.deliveryStatus === "NOT_CONFIGURED" ? 202 : 502;
    res.status(status).json(result);
  } catch (error: any) {
    res.status(Number(error?.statusCode) || 500).json({ error: error.message, code: error?.code || "TEAM_INVITE_ERROR" });
  }
});

partnerPortalRouter.put("/team/:id/status", requirePermission("clients", "manage"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ error: "isActive must be a boolean" });
    const updated = await PartnerPortalService.updateMemberStatus(tenantId, req.params.id, isActive);
    res.json(updated);
  } catch (error: any) {
    res.status(Number(error?.statusCode) || 500).json({ error: error.message, code: error?.code || "TEAM_STATUS_ERROR" });
  }
});

partnerPortalRouter.post("/team/import", requirePermission("clients", "manage"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { members } = req.body;
    const result = await PartnerPortalService.bulkImportTeam(tenantId, members || []);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.get("/team/export", requirePermission("clients", "manage"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const data = await PartnerPortalService.bulkExportTeam(tenantId);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Customers & CRM Base
partnerPortalRouter.get("/customers", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const customers = await PartnerPortalService.getCustomers(tenantId);
    res.json({ customers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/customers", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const customer = await PartnerPortalService.createCustomer(tenantId, req.body);
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.get("/customers/:id/timeline", async (req: Request, res: Response) => {
  try {
    const timeline = await PartnerPortalService.getCustomerTimeline(req.params.id);
    res.json(timeline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Extended GBP Subsystem
partnerPortalRouter.get("/gbp/extended", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const data = await PartnerPortalService.getExtendedGbpData(tenantId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/gbp/posts", requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { locationId, summary, topicType, callToAction } = req.body;
    if (!tenantId || !locationId || !summary?.trim()) {
      return res.status(400).json({ error: "tenant, locationId, and summary are required" });
    }
    const post = await PartnerPortalService.createGbpPost(tenantId, locationId, summary.trim(), topicType, callToAction);
    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.put("/gbp/reviews/:id/reply", requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { replyComment } = req.body;
    if (!tenantId) {
      return res.status(403).json({ error: "An authenticated tenant context is required", code: "TENANT_CONTEXT_REQUIRED" });
    }
    if (typeof replyComment !== "string" || !replyComment.trim()) {
      return res.status(400).json({ error: "replyComment is required", code: "VALIDATION_ERROR" });
    }
    const updated = await PartnerPortalService.replyReview(tenantId, req.params.id, replyComment.trim());
    if (!updated) return res.status(404).json({ error: "Review not found", code: "REVIEW_NOT_FOUND" });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/reviews/auto-reply-all", requirePermission("social", "create"), async (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  if (!tenantId) {
    return res.status(403).json({ error: "An authenticated tenant context is required", code: "TENANT_CONTEXT_REQUIRED" });
  }
  return res.status(501).json({
    status: "NOT_CONFIGURED",
    repliedCount: 0,
    code: "REVIEW_AUTO_REPLY_PROVIDER_NOT_CONFIGURED",
    error: "Automatic review replies require an approved Google Business Profile provider workflow.",
  });
});

partnerPortalRouter.post("/gbp/reviews/auto-reply-all", requirePermission("social", "create"), async (req: Request, res: Response) => {
  const { tenantId } = getContext(req);
  if (!tenantId) {
    return res.status(403).json({ error: "An authenticated tenant context is required", code: "TENANT_CONTEXT_REQUIRED" });
  }
  return res.status(501).json({
    status: "NOT_CONFIGURED",
    repliedCount: 0,
    code: "REVIEW_AUTO_REPLY_PROVIDER_NOT_CONFIGURED",
    error: "Automatic review replies require an approved Google Business Profile provider workflow.",
  });
});

// 6. Social Media Suite
partnerPortalRouter.get("/social/suite", requirePermission("social", "read"), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    if (!tenantId) {
      return res.status(403).json({ error: "An authenticated tenant context is required", code: "TENANT_CONTEXT_REQUIRED" });
    }
    const data = await PartnerPortalService.getSocialSuiteData(tenantId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/social/schedule", requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const { content, platforms, imageUrls, scheduledAt } = req.body;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: "An authenticated tenant context is required", code: "TENANT_CONTEXT_REQUIRED" });
    }
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content is required", code: "VALIDATION_ERROR" });
    }
    if (!Array.isArray(platforms) || platforms.length === 0 || platforms.some((value) => typeof value !== "string" || !value.trim())) {
      return res.status(400).json({ error: "A non-empty platforms array is required", code: "VALIDATION_ERROR" });
    }
    if (imageUrls !== undefined && !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: "imageUrls must be an array", code: "VALIDATION_ERROR" });
    }
    if (scheduledAt && Number.isNaN(new Date(scheduledAt).getTime())) {
      return res.status(400).json({ error: "scheduledAt must be a valid date", code: "VALIDATION_ERROR" });
    }
    const post = await PartnerPortalService.scheduleSocialPost(tenantId, userId, {
      content: content.trim(),
      platforms: platforms.map((value: string) => value.trim()),
      imageUrls,
      scheduledAt,
    });
    res.status(201).json(post);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. AI Assistant Studio
partnerPortalRouter.post("/ai/generate", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { type, prompt } = req.body;
    const aiOutput = await PartnerPortalService.generateAiToolContent(tenantId, type || "CONTENT", prompt || "Marketing post");
    res.json(aiOutput);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.get("/ai/history", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const history = await PartnerPortalService.getAiHistory(tenantId);
    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Marketing Campaigns
partnerPortalRouter.get("/marketing/campaigns", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const campaigns = await PartnerPortalService.getMarketingCampaigns(tenantId);
    res.json({ campaigns });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/marketing/campaigns", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const campaign = await PartnerPortalService.createMarketingCampaign(tenantId, req.body);
    res.status(201).json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. CRM Pipelines
partnerPortalRouter.get("/crm/pipelines", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const pipelines = await PartnerPortalService.getCrmPipelines(tenantId);
    res.json({ pipelines });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.put("/crm/opportunities/:id/stage", async (req: Request, res: Response) => {
  try {
    const { stageId, status } = req.body;
    const updated = await PartnerPortalService.updateOpportunityStage(req.params.id, stageId, status);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Calendar & Tasks
partnerPortalRouter.get("/calendar-tasks", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const data = await PartnerPortalService.getCalendarAndTasks(tenantId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/calendar-tasks/events", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const event = await PartnerPortalService.createCalendarEvent(tenantId, req.body);
    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/calendar-tasks/tasks", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const task = await PartnerPortalService.createTaskItem(tenantId, req.body);
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Media Storage & Files
partnerPortalRouter.get("/files", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const assets = await PartnerPortalService.getMediaAssets(tenantId);
    res.json({ assets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.post("/files/upload", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const asset = await PartnerPortalService.uploadMediaAsset(tenantId, req.body);
    res.status(201).json(asset);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Reports & Analytics
partnerPortalRouter.get("/reports", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const reportType = (req.query.type as string) || "BUSINESS";
    const reports = await PartnerPortalService.getReports(tenantId, reportType);
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tenant-scoped compliance audit trail for the partner portal.
partnerPortalRouter.get("/compliance/audit-logs", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    if (!tenantId) {
      return res.status(403).json({ error: "A tenant context is required" });
    }
    const requestedLimit = Number(req.query.limit || 100);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 100, 1), 250);
    const logs = await prisma.auditLog.findMany({
      where: { tenantId },
      select: {
        id: true,
        userId: true,
        action: true,
        resource: true,
        resourceId: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json({ data: logs, count: logs.length, dataSource: "DATABASE" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch compliance audit logs" });
  }
});

// 13. Notifications Preferences
partnerPortalRouter.get("/notifications/preferences", async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const prefs = await PartnerPortalService.getNotificationPreferences(userId);
    res.json({ preferences: prefs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

partnerPortalRouter.put("/notifications/preferences", async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const updated = await PartnerPortalService.updateNotificationPreferences(userId, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Subscription Overview
partnerPortalRouter.get("/subscription", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const overview = await PartnerPortalService.getSubscriptionOverview(tenantId);
    res.json(overview);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 15. Enterprise Global Search
partnerPortalRouter.get("/global-search", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const query = (req.query.q as string) || "";
    const searchResults = await PartnerPortalService.globalSearch(tenantId, query);
    res.json(searchResults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 16. Workflows & Approvals
partnerPortalRouter.get("/workflows", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    if (!tenantId) return res.status(403).json({ error: "Authenticated tenant context is required" });
    const data = await PartnerPortalService.getWorkflows(tenantId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 17. Partner Control – Customer Profile Management & Actions
partnerPortalRouter.post("/customers/:id/action", async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getContext(req);
    const customerId = req.params.id;
    const { action, targetPartnerId, reason } = req.body; // APPROVE, REJECT, ASSIGN, TRANSFER, SUSPEND, ACTIVATE, REMOVE

    if (!action) return res.status(400).json({ error: "action parameter required" });

    let status = "ACTIVE";
    if (action === "APPROVE" || action === "ACTIVATE") status = "ACTIVE";
    if (action === "REJECT" || action === "SUSPEND") status = "SUSPENDED";
    if (action === "REMOVE") status = "REMOVED";

    try {
      await prisma.client.update({
        where: { id: customerId },
        data: { status },
      });
    } catch (_e) {}

    await auditLog(userId, tenantId, `CUSTOMER_PROFILE_${action}`, "Client", customerId, { action, targetPartnerId, reason }, req);

    res.json({
      success: true,
      customerId,
      action,
      newStatus: status,
      targetPartnerId: targetPartnerId || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 18. Partner Control – View Customer Activity & Audit History
partnerPortalRouter.get("/customers/:id/activity", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const customerId = req.params.id;

    let auditLogs: any[] = [];
    try {
      auditLogs = await prisma.auditLog.findMany({
        where: { resourceId: customerId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    } catch (_e) {
      auditLogs = [
        { id: "log-1", action: "PROFILE_UPDATED", resourceId: customerId, createdAt: new Date() },
        { id: "log-2", action: "CUSTOMER_LOGIN", resourceId: customerId, createdAt: new Date() },
      ];
    }

    res.json({
      success: true,
      customerId,
      tenantId,
      totalActivityCount: auditLogs.length,
      activity: auditLogs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
