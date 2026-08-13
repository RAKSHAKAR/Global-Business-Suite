import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { EnterpriseCaptchaService } from "../../services/captchaService";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";

const router = Router();

// POST /api/v1/leads - Capture leads from Marketing Portal with mandatory CAPTCHA
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      companyName,
      notes,
      captchaId,
      captchaToken,
      whatsappVideoRequested,
    } = req.body;

    const normalizedFirstName = typeof firstName === "string" ? firstName.trim().slice(0, 100) : "";
    const normalizedLastName = typeof lastName === "string" ? lastName.trim().slice(0, 100) : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase().slice(0, 254) : "";
    if (!normalizedFirstName || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ error: "A first name and valid work email are required" });
    }

    if (!captchaId || !captchaToken) {
      return res
        .status(401)
        .json({ error: "CAPTCHA token and ID are required" });
    }

    // Enforce server-side CAPTCHA verification
    const captchaResult = EnterpriseCaptchaService.verifyCaptcha(
      captchaId,
      captchaToken,
    );
    if (!captchaResult.success) {
      return res
        .status(401)
        .json({ error: captchaResult.error || "CAPTCHA validation failed" });
    }

    // Public enquiries must route to an explicitly chosen sales tenant. Local
    // development uses the seeded demo tenant; production never guesses or
    // creates a tenant as a side effect of a public request.
    const configuredTenantId = process.env.LEADS_TENANT_ID?.trim();
    const tenant = configuredTenantId
      ? await prisma.tenant.findUnique({ where: { id: configuredTenantId } })
      : process.env.NODE_ENV !== "production"
        ? await prisma.tenant.findFirst({ where: { subdomain: "demo", isActive: true } })
        : null;
    if (!tenant) {
      return res.status(503).json({
        error: "Lead routing is not configured.",
        code: "LEADS_TENANT_NOT_CONFIGURED",
      });
    }

    const clientLead = await prisma.client.create({
      data: {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        phone: phone || null,
        status: "LEAD",
        tenantId: tenant.id,
      },
    });

    // Create Audit Log record for real-time lead tracking
    await prisma.auditLog
      .create({
        data: {
          tenantId: tenant.id,
          action: "LEAD_CAPTURED",
          resource: "Client",
          resourceId: clientLead.id,
          details: JSON.stringify({
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            email: normalizedEmail,
            phone,
            companyName,
            notes,
            whatsappVideoRequested: !!whatsappVideoRequested,
          }),
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      })
      .catch(() => {});

    res.status(201).json({
      success: true,
      message:
        "Thank you! Your lead request has been registered. Our sales team will reach out shortly.",
      leadId: clientLead.id,
    });
  } catch (error) {
    console.error("[leads:create]", error);
    res.status(500).json({ error: "Failed to register lead" });
  }
});

// GET /api/v1/leads - Fetch all captured leads (Admin Portal & Mobile)
router.get(
  "/",
  authMiddleware,
  requirePermission("clients", "manage"),
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1")));
      const limit = Math.min(100, parseInt(String(req.query.limit || "50")));

      const [leads, total] = await Promise.all([
        prisma.client.findMany({
          where: { status: "LEAD" },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { tenant: true },
        }),
        prisma.client.count({ where: { status: "LEAD" } }),
      ]);

      res.json({
        data: leads,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error("[leads:list]", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  },
);

export default router;
