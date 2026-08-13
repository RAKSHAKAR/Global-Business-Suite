import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";

export const customerSuccessEngineRouter = Router();

// GET /api/v1/crm/customer-success/health - Customer Health Scores Matrix
customerSuccessEngineRouter.get("/health", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;

    let healthScores = await prisma.customerHealthScore.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { overallScore: "asc" },
    });

    if (healthScores.length === 0 && tenantId) {
      // Seed initial sample health scores for accounts/clients if empty
      const sampleAccount = await prisma.crmAccount.findFirst({ where: { tenantId } });
      const created = await prisma.customerHealthScore.create({
        data: {
          tenantId,
          accountId: sampleAccount?.id || null,
          overallScore: 88,
          scoreCategory: "HEALTHY",
          npsScore: 9.0,
          csatScore: 4.8,
          usageActivityScore: 92,
          supportTicketScore: 95,
          billingScore: 100,
          aiChurnRiskScore: 4.5,
          aiChurnReason: "High product engagement and zero billing arrears.",
        },
      });
      healthScores = [created];
    }

    res.json({ healthScores });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch health scores", details: error?.message });
  }
});

// POST /api/v1/crm/customer-success/health/calculate - Re-calculate health score & churn risk
customerSuccessEngineRouter.post("/health/calculate", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const { accountId, clientId, npsScore, csatScore, usageScore, supportScore } = req.body;

    const nps = parseFloat(npsScore) || 8.0;
    const csat = parseFloat(csatScore) || 4.5;
    const usage = parseInt(usageScore) || 85;
    const support = parseInt(supportScore) || 90;

    // Overall Health Score formula: weighted composite
    const overall = Math.round((nps * 10 * 0.25) + (csat * 20 * 0.25) + (usage * 0.25) + (support * 0.25));
    let category = "HEALTHY";
    let aiChurnRiskScore = 5.0; // 5%
    let aiChurnReason = "Client is healthy with active platform adoption.";

    if (overall < 50) {
      category = "CRITICAL";
      aiChurnRiskScore = 78.5;
      aiChurnReason = "Low NPS and dropped usage activity in last 30 days.";
    } else if (overall < 75) {
      category = "AT_RISK";
      aiChurnRiskScore = 35.0;
      aiChurnReason = "Moderate support ticket resolution delays noticed.";
    }

    const health = await prisma.customerHealthScore.create({
      data: {
        tenantId,
        accountId: accountId || null,
        clientId: clientId || null,
        overallScore: overall,
        scoreCategory: category,
        npsScore: nps,
        csatScore: csat,
        usageActivityScore: usage,
        supportTicketScore: support,
        billingScore: 95,
        aiChurnRiskScore,
        aiChurnReason,
      },
    });

    res.json({ health, message: "Customer health score and AI churn risk calculated" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to calculate health score", details: error?.message });
  }
});

// GET & POST /api/v1/crm/customer-success/plans - Onboarding & Goal Plans
customerSuccessEngineRouter.get("/plans", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;

    const plans = await prisma.customerSuccessPlan.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: "desc" },
    });

    res.json({ plans });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch success plans", details: error?.message });
  }
});

customerSuccessEngineRouter.post("/plans", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const { accountId, clientId, title, targetCompletionDate, milestones } = req.body;

    if (!title) return res.status(400).json({ error: "Success plan title is required" });

    const plan = await prisma.customerSuccessPlan.create({
      data: {
        tenantId,
        accountId: accountId || null,
        clientId: clientId || null,
        title,
        status: "ACTIVE",
        targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : null,
        milestonesJson: JSON.stringify(milestones || [
          { name: "Kickoff Meeting", completed: true },
          { name: "Platform Integration", completed: false },
          { name: "Team Onboarding & Training", completed: false },
          { name: "30-Day Value Review", completed: false },
        ]),
      },
    });

    res.status(201).json({ plan });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create success plan", details: error?.message });
  }
});

// GET & POST /api/v1/crm/customer-success/feedback - NPS & CSAT Feedback
customerSuccessEngineRouter.get("/feedback", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;

    const feedback = await prisma.customerFeedback.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: "desc" },
    });

    res.json({ feedback });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch feedback", details: error?.message });
  }
});

customerSuccessEngineRouter.post("/feedback", async (req: Request, res: Response) => {
  try {
    const { tenantId, type, rating, comments, category, accountId, clientId } = req.body;
    let targetTenantId = tenantId;
    if (!targetTenantId) {
      targetTenantId = (await prisma.tenant.findFirst())?.id;
    }

    if (!rating) return res.status(400).json({ error: "Rating is required" });

    const feedback = await prisma.customerFeedback.create({
      data: {
        tenantId: targetTenantId,
        accountId: accountId || null,
        clientId: clientId || null,
        type: type || "NPS",
        rating: parseInt(rating),
        comments: comments || null,
        category: category || "PRODUCT",
        followUpStatus: parseInt(rating) <= 6 ? "IN_PROGRESS" : "UNTOUCHED",
      },
    });

    res.status(201).json({ feedback, message: "Thank you for your feedback!" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to submit feedback", details: error?.message });
  }
});

// GET /api/v1/crm/customer-success/renewals - Expansion & Renewal Pipeline
customerSuccessEngineRouter.get("/renewals", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;

    const renewals = await prisma.customerRenewalUpsell.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { targetDate: "asc" },
    });

    res.json({ renewals });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch renewal pipeline", details: error?.message });
  }
});
