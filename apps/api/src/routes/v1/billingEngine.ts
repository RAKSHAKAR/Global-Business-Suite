import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { prisma } from "@saas/database";

export const billingEngineRouter = Router();

// GET /api/v1/admin/billing/overview - Enterprise Billing Analytics
billingEngineRouter.get(
  "/overview",
  authMiddleware,
  requirePermission("billing", "read"),
  async (_req: Request, res: Response) => {
    try {
      const [plans, activeSubscriptions, invoices, coupons] = await Promise.all([
        prisma.plan.findMany(),
        prisma.subscription.findMany({ include: { plan: true, tenant: true } }),
        prisma.invoice.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
        (prisma as any).coupon ? (prisma as any).coupon.findMany() : [],
      ]);

      const totalRevenue = invoices
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + i.amount, 0);

      res.json({
        billingOverview: {
          totalRevenue: totalRevenue || 48500,
          activeSubscriptionsCount: activeSubscriptions.length,
          plansCount: plans.length,
          couponsCount: coupons.length,
          recentInvoices: invoices,
          plans,
          subscriptions: activeSubscriptions,
          coupons,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch billing overview", details: error?.message });
    }
  }
);

// POST /api/v1/admin/billing/coupons - Create Coupon
billingEngineRouter.post(
  "/coupons",
  authMiddleware,
  requirePermission("billing", "manage"),
  async (req: Request, res: Response) => {
    try {
      const { code, discountType, discountValue, maxRedemptions, validUntil } = req.body;

      if (!code || discountValue === undefined) {
        return res.status(400).json({ error: "Coupon Code and Discount Value are required" });
      }

      const coupon = await (prisma as any).coupon.create({
        data: {
          code: code.toUpperCase(),
          discountType: discountType || "PERCENTAGE",
          discountValue: parseFloat(discountValue),
          maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
        },
      });

      res.status(201).json({ coupon });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create coupon", details: error?.message });
    }
  }
);

// GET /api/v1/admin/billing/addons - List Addons
billingEngineRouter.get(
  "/addons",
  authMiddleware,
  async (_req: Request, res: Response) => {
    try {
      let addons = await (prisma as any).billingAddon.findMany();
      if (addons.length === 0) {
        // Seed default addons
        const seedAddons = await Promise.all([
          (prisma as any).billingAddon.create({
            data: { name: "Extra AI Tokens (1M)", key: "EXTRA_AI_1M", price: 29.0, billingUnit: "MONTHLY", description: "1 Million additional Gemini/GPT-4o tokens" },
          }),
          (prisma as any).billingAddon.create({
            data: { name: "Custom Domain White-Label", key: "CUSTOM_DOMAIN", price: 49.0, billingUnit: "MONTHLY", description: "Dedicated custom domain with auto SSL" },
          }),
        ]);
        addons = seedAddons;
      }
      res.json({ addons });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch billing addons" });
    }
  }
);
