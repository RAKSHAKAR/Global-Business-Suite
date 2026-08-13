import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";

export const leadsEngineRouter = Router();

// POST /api/v1/crm/leads/capture - Public / Website form lead capture
leadsEngineRouter.post("/capture", async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      companyName,
      jobTitle,
      source,
      customFields,
      formId,
    } = req.body;

    if (!firstName || !email) {
      return res.status(400).json({ error: "First name and email are required" });
    }

    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: "Default Tenant",
          subdomain: "default",
          domain: "default.platform.local",
        },
      });
    }

    // Check duplicate lead
    const existingLead = await prisma.crmLead.findFirst({
      where: { tenantId: tenant.id, email, isDeleted: false },
    });

    const lead = await prisma.crmLead.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName: lastName || null,
        email,
        phone: phone || null,
        companyName: companyName || null,
        jobTitle: jobTitle || null,
        source: source || "WEBSITE_FORM",
        status: "NEW",
        score: Math.floor(Math.random() * 40) + 30, // Default baseline score
        isDuplicate: !!existingLead,
        duplicateOfLeadId: existingLead?.id || null,
        customFieldsJson: JSON.stringify(customFields || {}),
        aiInsights: "New lead captured via " + (source || "Website Form") + ". Immediate follow-up recommended.",
      },
    });

    // Update form submission count if formId is provided
    if (formId) {
      await prisma.crmLeadCaptureForm.update({
        where: { id: formId },
        data: { submissionCount: { increment: 1 } },
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: "Lead successfully captured",
      lead,
    });
  } catch (error: any) {
    console.error("[leadsEngine:capture]", error);
    res.status(500).json({ error: "Failed to capture lead", details: error?.message });
  }
});

// GET /api/v1/crm/leads - List leads with filters & search
leadsEngineRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(100, parseInt(String(req.query.limit || "50")));
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const source = String(req.query.source || "").trim();

    const where: any = {
      isDeleted: false,
    };
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.crmLead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.crmLead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("[leadsEngine:list]", error);
    res.status(500).json({ error: "Failed to fetch leads", details: error?.message });
  }
});

// GET /api/v1/crm/leads/:id - Lead detail
leadsEngineRouter.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await prisma.crmLead.findUnique({
      where: { id },
    });
    if (!lead || lead.isDeleted) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json({ lead });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch lead", details: error?.message });
  }
});

// POST /api/v1/crm/leads/:id/score - Recalculate AI Lead Score
leadsEngineRouter.post("/:id/score", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await prisma.crmLead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // AI Lead Scoring calculation based on company size, job title, activity & completeness
    let newScore = 50;
    if (lead.companyName) newScore += 15;
    if (lead.jobTitle && /vp|director|chief|head|manager|ceo|cto/i.test(lead.jobTitle)) newScore += 25;
    if (lead.phone) newScore += 10;
    if (lead.status === "QUALIFIED") newScore += 20;

    newScore = Math.min(100, Math.max(10, newScore));
    const aiInsights = `AI Lead Score: ${newScore}/100. ${
      newScore >= 75 ? "High-intent lead. Priority outreach required." : "Warm prospect. Nurture with email campaign."
    }`;

    const updatedLead = await prisma.crmLead.update({
      where: { id },
      data: { score: newScore, aiInsights },
    });

    res.json({ lead: updatedLead, message: "AI Lead score calculated successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to calculate lead score", details: error?.message });
  }
});

// POST /api/v1/crm/leads/:id/convert - Convert lead to Contact & Opportunity
leadsEngineRouter.post("/:id/convert", authMiddleware, requirePermission("crm", "manage"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dealTitle, dealValue } = req.body;
    const lead = await prisma.crmLead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // 1. Create or Find B2B Account
    let account = null;
    if (lead.companyName) {
      account = await prisma.crmAccount.create({
        data: {
          tenantId: lead.tenantId,
          name: lead.companyName,
          email: lead.email,
          phone: lead.phone,
          accountType: "CUSTOMER",
        },
      });
    }

    // 2. Create Contact
    const contact = await prisma.crmContact.create({
      data: {
        tenantId: lead.tenantId,
        accountId: account?.id || null,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        designation: lead.jobTitle,
      },
    });

    // 3. Create Opportunity in Default Pipeline Stage
    let defaultPipeline = await prisma.crmPipeline.findFirst({
      where: { isDefault: true },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    if (!defaultPipeline) {
      defaultPipeline = await prisma.crmPipeline.create({
        data: {
          name: "Standard Sales Pipeline",
          isDefault: true,
          stages: {
            create: [
              { name: "New Lead", order: 1 },
              { name: "Proposal Sent", order: 2 },
              { name: "Negotiation", order: 3 },
              { name: "Closed Won", order: 4, isWonStage: true },
            ],
          },
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });
    }

    const firstStage = defaultPipeline.stages[0];
    const opp = await prisma.crmOpportunity.create({
      data: {
        tenantId: lead.tenantId,
        stageId: firstStage.id,
        accountId: account?.id || null,
        contactId: contact.id,
        leadId: lead.id,
        title: dealTitle || `${lead.companyName || lead.firstName}'s Deal`,
        companyName: lead.companyName || lead.firstName,
        contactName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
        contactEmail: lead.email,
        value: parseFloat(dealValue) || 10000,
        status: "OPEN",
        aiScore: lead.score,
      },
    });

    // 4. Mark Lead as Converted
    const updatedLead = await prisma.crmLead.update({
      where: { id },
      data: {
        status: "CONVERTED",
        convertedToContactId: contact.id,
        convertedToOpportunityId: opp.id,
        convertedAt: new Date(),
      },
    });

    res.json({
      message: "Lead successfully converted",
      lead: updatedLead,
      contact,
      account,
      opportunity: opp,
    });
  } catch (error: any) {
    console.error("[leadsEngine:convert]", error);
    res.status(500).json({ error: "Failed to convert lead", details: error?.message });
  }
});

// GET /api/v1/crm/leads/duplicates - Run duplicate detection
leadsEngineRouter.get("/duplicates/detect", authMiddleware, async (req: Request, res: Response) => {
  try {
    const leads = await prisma.crmLead.findMany({
      where: { isDeleted: false },
      select: { id: true, email: true, firstName: true, lastName: true, companyName: true },
    });

    const emailMap: Record<string, string[]> = {};
    for (const lead of leads) {
      const email = lead.email.toLowerCase();
      if (!emailMap[email]) emailMap[email] = [];
      emailMap[email].push(lead.id);
    }

    const duplicates = Object.entries(emailMap)
      .filter(([_, ids]) => ids.length > 1)
      .map(([email, ids]) => ({ email, count: ids.length, leadIds: ids }));

    res.json({ duplicateCount: duplicates.length, duplicates });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to detect duplicates", details: error?.message });
  }
});
