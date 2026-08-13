import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// Get AI config for a specific tenant (includes all providers so frontend can render toggle list)
router.get("/:tenantId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tenantId } = req.params;

    // Fetch all providers
    const providers = await prisma.aiProvider.findMany({
      orderBy: { name: "asc" },
      include: { models: true },
    });

    // Fetch existing configs for this tenant
    const configs = await prisma.tenantAiConfig.findMany({
      where: { tenantId },
    });

    const configMap = new Map(configs.map((c) => [c.providerId, c]));

    const result = providers.map((p) => {
      const cfg = configMap.get(p.id);
      return {
        providerId: p.id,
        providerName: p.name,
        providerKey: p.providerKey,
        providerIsActive: p.isActive,
        modelCount: p.models.length,
        // If config exists, use its isActive status. Otherwise default to true (if provider is active globally)
        isActive: cfg ? cfg.isActive : p.isActive,
        quotaMonthly: cfg ? cfg.quotaMonthly : 0,
        usageCurrent: cfg ? cfg.usageCurrent : 0,
        overrideKey: cfg ? cfg.overrideKey : null,
        hasExplicitConfig: !!cfg,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch tenant AI configs:", error);
    res.status(500).json({ error: "Failed to fetch tenant AI configs" });
  }
});

// Get all tenant configs for a specific provider
router.get(
  "/provider/:providerId",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { providerId } = req.params;

      const tenants = await prisma.tenant.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          domain: true,
          subdomain: true,
          isActive: true,
        },
      });

      const provider = await prisma.aiProvider.findUnique({
        where: { id: providerId },
      });

      if (!provider) {
        return res.status(404).json({ error: "AI Provider not found" });
      }

      const configs = await prisma.tenantAiConfig.findMany({
        where: { providerId },
      });

      const configMap = new Map(configs.map((c) => [c.tenantId, c]));

      const result = tenants.map((t) => {
        const cfg = configMap.get(t.id);
        return {
          tenantId: t.id,
          tenantName: t.name,
          tenantDomain: t.domain || t.subdomain || "N/A",
          tenantIsActive: t.isActive,
          isActive: cfg ? cfg.isActive : provider.isActive,
          quotaMonthly: cfg ? cfg.quotaMonthly : 0,
          usageCurrent: cfg ? cfg.usageCurrent : 0,
          overrideKey: cfg ? cfg.overrideKey : null,
          hasExplicitConfig: !!cfg,
        };
      });

      res.json({ provider, assignments: result });
    } catch (error) {
      console.error("Failed to fetch provider tenant configs:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch provider tenant configs" });
    }
  },
);

// Bulk update AI providers for a specific tenant
router.post(
  "/bulk-tenant/:tenantId",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { tenantId } = req.params;
      const { configs } = req.body; // Array of { providerId, isActive, quotaMonthly, overrideKey }

      if (!Array.isArray(configs)) {
        return res.status(400).json({ error: "configs must be an array" });
      }

      const operations = configs.map((item) => {
        return prisma.tenantAiConfig.upsert({
          where: {
            tenantId_providerId: {
              tenantId,
              providerId: item.providerId,
            },
          },
          update: {
            isActive: item.isActive,
            quotaMonthly:
              item.quotaMonthly !== undefined ? Number(item.quotaMonthly) : 0,
            overrideKey: item.overrideKey || null,
          },
          create: {
            tenantId,
            providerId: item.providerId,
            isActive: item.isActive !== undefined ? item.isActive : true,
            quotaMonthly:
              item.quotaMonthly !== undefined ? Number(item.quotaMonthly) : 0,
            overrideKey: item.overrideKey || null,
          },
        });
      });

      await prisma.$transaction(operations);
      res.json({ message: "Tenant AI configurations updated successfully" });
    } catch (error) {
      console.error("Error updating tenant AI bulk config:", error);
      res
        .status(500)
        .json({ error: "Failed to update tenant AI configuration" });
    }
  },
);

// Bulk update tenant assignments for a specific provider
router.post(
  "/bulk-provider/:providerId",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { providerId } = req.params;
      const { assignments } = req.body; // Array of { tenantId, isActive, quotaMonthly }

      if (!Array.isArray(assignments)) {
        return res.status(400).json({ error: "assignments must be an array" });
      }

      const operations = assignments.map((item) => {
        return prisma.tenantAiConfig.upsert({
          where: {
            tenantId_providerId: {
              tenantId: item.tenantId,
              providerId,
            },
          },
          update: {
            isActive: item.isActive,
            quotaMonthly:
              item.quotaMonthly !== undefined ? Number(item.quotaMonthly) : 0,
          },
          create: {
            tenantId: item.tenantId,
            providerId,
            isActive: item.isActive !== undefined ? item.isActive : true,
            quotaMonthly:
              item.quotaMonthly !== undefined ? Number(item.quotaMonthly) : 0,
          },
        });
      });

      await prisma.$transaction(operations);
      res.json({ message: "Provider tenant assignments updated successfully" });
    } catch (error) {
      console.error("Error updating provider tenant assignments:", error);
      res
        .status(500)
        .json({ error: "Failed to update provider tenant assignments" });
    }
  },
);

// Configure (Create or Update) single AI Provider for a Tenant
router.post("/:tenantId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { tenantId } = req.params;
    const { providerId, isActive, quotaMonthly, overrideKey } = req.body;

    if (!providerId) {
      return res.status(400).json({ error: "providerId is required" });
    }

    const config = await prisma.tenantAiConfig.upsert({
      where: {
        tenantId_providerId: {
          tenantId,
          providerId,
        },
      },
      update: {
        isActive: isActive !== undefined ? isActive : undefined,
        quotaMonthly:
          quotaMonthly !== undefined ? Number(quotaMonthly) : undefined,
        overrideKey: overrideKey !== undefined ? overrideKey : undefined,
      },
      create: {
        tenantId,
        providerId,
        isActive: isActive !== undefined ? isActive : true,
        quotaMonthly: quotaMonthly ? Number(quotaMonthly) : 0,
        overrideKey: overrideKey || null,
      },
    });

    res.json(config);
  } catch (error) {
    console.error("Error configuring tenant AI:", error);
    res.status(500).json({ error: "Failed to configure tenant AI" });
  }
});

export default router;
