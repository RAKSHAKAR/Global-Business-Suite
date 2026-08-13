import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { prisma } from "@saas/database";

export const crmEngineRouter = Router();

// GET /api/v1/admin/crm/pipelines - List CRM pipelines & stages
crmEngineRouter.get("/pipelines", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;

    let pipelines = await prisma.crmPipeline.findMany({
      where: { isDeleted: false, OR: [{ tenantId }, { tenantId: null }] },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            opportunities: {
              where: { isDeleted: false },
              orderBy: { updatedAt: "desc" },
              include: { activities: true },
            },
          },
        },
      },
    });

    if (pipelines.length === 0) {
      // Seed default pipeline if none exists
      const defaultPipeline = await prisma.crmPipeline.create({
        data: {
          tenantId,
          name: "Enterprise Sales Pipeline",
          description: "Default GBS CRM Pipeline",
          isDefault: true,
          stages: {
            create: [
              { name: "New Lead", order: 1, winProbability: 10 },
              { name: "Contacted", order: 2, winProbability: 25 },
              { name: "Proposal Sent", order: 3, winProbability: 50 },
              { name: "Negotiation", order: 4, winProbability: 75 },
              { name: "Closed Won", order: 5, winProbability: 100, isWonStage: true },
            ],
          },
        },
        include: {
          stages: {
            include: { opportunities: true },
          },
        },
      });
      pipelines = [defaultPipeline];
    }

    res.json({ pipelines });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch CRM pipelines", details: error?.message });
  }
});

// POST /api/v1/admin/crm/pipelines - Create new sales pipeline
crmEngineRouter.post("/pipelines", authMiddleware, requirePermission("crm", "manage"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const { name, description, stages } = req.body;

    if (!name) return res.status(400).json({ error: "Pipeline name is required" });

    const pipeline = await prisma.crmPipeline.create({
      data: {
        tenantId,
        name,
        description: description || null,
        stages: stages && Array.isArray(stages)
          ? {
              create: stages.map((s: any, idx: number) => ({
                name: s.name,
                order: s.order || idx + 1,
                winProbability: s.winProbability || 50,
                isWonStage: !!s.isWonStage,
                isLostStage: !!s.isLostStage,
              })),
            }
          : undefined,
      },
      include: { stages: true },
    });

    res.status(201).json({ pipeline });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create CRM pipeline", details: error?.message });
  }
});

// GET /api/v1/crm/opportunities - List CRM Opportunities
crmEngineRouter.get("/opportunities", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const opportunities = await prisma.crmOpportunity.findMany({
      where: { isDeleted: false, ...(tenantId ? { tenantId } : {}) },
      include: { stage: true, account: true, contact: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ opportunities });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch CRM opportunities", details: error?.message });
  }
});

// POST /api/v1/admin/crm/opportunities - Create CRM Opportunity
crmEngineRouter.post("/opportunities", authMiddleware, requirePermission("crm", "manage"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const { stageId, title, companyName, contactName, contactEmail, value, probability, expectedCloseDate, competitorName } = req.body;

    if (!stageId || !title) {
      return res.status(400).json({ error: "StageId and Title are required" });
    }

    const opp = await prisma.crmOpportunity.create({
      data: {
        tenantId,
        stageId,
        title,
        companyName: companyName || null,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        value: parseFloat(value) || 0,
        probability: parseInt(probability) || 50,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        competitorName: competitorName || null,
        aiScore: Math.min(100, Math.max(10, parseInt(probability) || 50)),
      },
    });

    res.status(201).json({ opportunity: opp });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create CRM opportunity", details: error?.message });
  }
});

// PUT /api/v1/admin/crm/opportunities/:id/stage - Move opportunity stage
crmEngineRouter.put("/opportunities/:id/stage", authMiddleware, requirePermission("crm", "manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stageId, status, winLossReason, winLossCategory } = req.body;

    const opp = await prisma.crmOpportunity.update({
      where: { id },
      data: {
        stageId: stageId || undefined,
        status: status || undefined,
        winLossReason: winLossReason || undefined,
        winLossCategory: winLossCategory || undefined,
        closedAt: (status === "WON" || status === "LOST") ? new Date() : undefined,
      },
    });

    res.json({ message: "Opportunity stage updated", opportunity: opp });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update opportunity stage", details: error?.message });
  }
});

// POST /api/v1/admin/crm/activities - Add Activity Note/Call Log
crmEngineRouter.post("/activities", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const { opportunityId, leadId, type, subject, details, outcome, durationMins, scheduledAt } = req.body;

    if (!subject) {
      return res.status(400).json({ error: "Activity subject is required" });
    }

    const activity = await prisma.crmActivity.create({
      data: {
        tenantId,
        opportunityId: opportunityId || null,
        leadId: leadId || null,
        type: type || "NOTE",
        subject,
        details: details || null,
        outcome: outcome || null,
        durationMins: parseInt(durationMins) || 15,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        performedBy: user.email || user.id,
      },
    });

    res.status(201).json({ activity });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to log activity", details: error?.message });
  }
});

// GET /api/v1/admin/crm/analytics - CRM & Win/Loss Pipeline Analytics
crmEngineRouter.get("/analytics", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;

    const [totalLeads, wonDeals, lostDeals, openDeals] = await Promise.all([
      prisma.crmLead.count({ where: { tenantId: tenantId || undefined, isDeleted: false } }),
      prisma.crmOpportunity.findMany({ where: { tenantId: tenantId || undefined, status: "WON", isDeleted: false } }),
      prisma.crmOpportunity.findMany({ where: { tenantId: tenantId || undefined, status: "LOST", isDeleted: false } }),
      prisma.crmOpportunity.findMany({ where: { tenantId: tenantId || undefined, status: "OPEN", isDeleted: false } }),
    ]);

    const wonRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
    const openPipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? ((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100).toFixed(1)
      : "100.0";

    res.json({
      analytics: {
        totalLeads,
        wonDealsCount: wonDeals.length,
        lostDealsCount: lostDeals.length,
        openDealsCount: openDeals.length,
        wonRevenue,
        openPipelineValue,
        winRatePercentage: parseFloat(winRate),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch CRM analytics", details: error?.message });
  }
});
