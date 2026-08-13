import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { prisma } from "@saas/database";

const router = Router();

/**
 * @swagger
 * /billing/plans:
 *   get:
 *     summary: List available subscription plans
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of plans
 */
router.get("/plans", authMiddleware, async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
    res.json(plans);
  } catch {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

/**
 * @swagger
 * /billing/invoices:
 *   get:
 *     summary: List invoices for the authenticated tenant
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of invoices
 */
router.get("/invoices", authMiddleware, async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      // Super admin: return all invoices paginated
      const invoices = await prisma.invoice.findMany({
        orderBy: { createdAt: "desc" },
        include: { tenant: true },
      });
      return res.json(invoices);
    }
    const invoices = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

/**
 * @swagger
 * /billing/subscriptions:
 *   get:
 *     summary: Get subscription for the authenticated tenant
 *     tags: [Billing]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Subscription details
 */
router.get("/subscriptions", authMiddleware, async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      const subs = await prisma.subscription.findMany({
        include: { tenant: true, plan: true },
        orderBy: { createdAt: "desc" },
      });
      return res.json(subs);
    }
    const sub = await prisma.subscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(sub || null);
  } catch {
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

export default router;
