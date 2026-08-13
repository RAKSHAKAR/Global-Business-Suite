import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";

export const contactsAccountsEngineRouter = Router();

// GET /api/v1/crm/accounts - List Accounts / Organizations
contactsAccountsEngineRouter.get("/accounts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const search = String(req.query.search || "").trim();

    const where: any = { isDeleted: false };
    if (tenantId) where.tenantId = tenantId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { industry: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const accounts = await prisma.crmAccount.findMany({
      where,
      include: {
        contacts: { where: { isDeleted: false } },
        opportunities: { where: { isDeleted: false } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ accounts });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch accounts", details: error?.message });
  }
});

// POST /api/v1/crm/accounts - Create B2B Account
contactsAccountsEngineRouter.post("/accounts", authMiddleware, requirePermission("crm", "manage"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const { name, accountType, industry, website, phone, email, annualRevenue, employeeCount, billingAddress, shippingAddress } = req.body;

    if (!name) return res.status(400).json({ error: "Account name is required" });

    const account = await prisma.crmAccount.create({
      data: {
        tenantId,
        name,
        accountType: accountType || "PROSPECT",
        industry: industry || null,
        website: website || null,
        phone: phone || null,
        email: email || null,
        annualRevenue: parseFloat(annualRevenue) || 0,
        employeeCount: parseInt(employeeCount) || 0,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || null,
      },
    });

    res.status(201).json({ account });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create account", details: error?.message });
  }
});

// GET /api/v1/crm/contacts - List Contacts
contactsAccountsEngineRouter.get("/contacts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const search = String(req.query.search || "").trim();

    const where: any = { isDeleted: false };
    if (tenantId) where.tenantId = tenantId;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const contacts = await prisma.crmContact.findMany({
      where,
      include: { account: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ contacts });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch contacts", details: error?.message });
  }
});

// POST /api/v1/crm/contacts - Create Individual Contact
contactsAccountsEngineRouter.post("/contacts", authMiddleware, requirePermission("crm", "manage"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const { accountId, firstName, lastName, email, phone, mobilePhone, designation, preferences } = req.body;

    if (!firstName || !email) return res.status(400).json({ error: "First name and email are required" });

    const contact = await prisma.crmContact.create({
      data: {
        tenantId,
        accountId: accountId || null,
        firstName,
        lastName: lastName || null,
        email,
        phone: phone || null,
        mobilePhone: mobilePhone || null,
        designation: designation || null,
        communicationPreferencesJson: JSON.stringify(preferences || { email: true, sms: true, whatsapp: true, push: true }),
      },
    });

    res.status(201).json({ contact });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create contact", details: error?.message });
  }
});

// PUT /api/v1/crm/contacts/:id/preferences - Update consent & preferences
contactsAccountsEngineRouter.put("/contacts/:id/preferences", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emailOptIn, smsOptIn, whatsappOptIn, pushOptIn } = req.body;

    const contact = await prisma.crmContact.update({
      where: { id },
      data: {
        communicationPreferencesJson: JSON.stringify({
          email: !!emailOptIn,
          sms: !!smsOptIn,
          whatsapp: !!whatsappOptIn,
          push: !!pushOptIn,
        }),
      },
    });

    res.json({ contact, message: "Communication preferences updated" });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update preferences", details: error?.message });
  }
});
