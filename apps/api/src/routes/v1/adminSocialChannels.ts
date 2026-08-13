import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { auditLog } from "../../services/auditLogger";

const router = Router();

// All routes require authentication (admin-level check done via tenantId === null)
router.use(authMiddleware);

// =============================================================================
// GET /api/v1/admin/social-channels
// List ALL tenant social channels (platform overview for super-admins)
// =============================================================================
router.get("/", async (req: Request, res: Response) => {
  try {
    const { platform, status, tenantId: filterTenant, page = "1", limit = "50" } = req.query;
    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(200, parseInt(String(limit)));

    const where: any = {};
    if (platform) where.platform = String(platform);
    if (filterTenant) where.tenantId = String(filterTenant);
    if (status === "ACTIVE") where.isActive = true;
    if (status === "INACTIVE") where.isActive = false;

    const [channels, total] = await Promise.all([
      prisma.socialChannel.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          platform: true,
          accountId: true,
          accountName: true,
          accountAvatar: true,
          isActive: true,
          tokenExpiresAt: true,
          createdAt: true,
          updatedAt: true,
          // Include tenant name for display
          tenant: { select: { name: true, subdomain: true } },
        },
        orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.socialChannel.count({ where }),
    ]);

    // Flatten tenant info
    const data = channels.map((c: any) => ({
      ...c,
      tenantName: c.tenant?.name ?? c.tenant?.subdomain ?? null,
      tenant: undefined,
    }));

    res.json({
      data,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error("[admin:social-channels:list]", err);
    res.status(500).json({ error: "Failed to fetch social channels" });
  }
});

// =============================================================================
// GET /api/v1/admin/social-channels/stats
// Platform-level statistics for admin dashboard
// =============================================================================
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const [total, active, byPlatform] = await Promise.all([
      prisma.socialChannel.count(),
      prisma.socialChannel.count({ where: { isActive: true } }),
      prisma.socialChannel.groupBy({
        by: ["platform"],
        _count: { id: true },
      }),
    ]);

    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [expiringSoon, expired] = await Promise.all([
      prisma.socialChannel.count({
        where: {
          tokenExpiresAt: { gt: now, lte: sevenDays },
          isActive: true,
        },
      }),
      prisma.socialChannel.count({
        where: { tokenExpiresAt: { lt: now } },
      }),
    ]);

    res.json({
      data: {
        total,
        active,
        inactive: total - active,
        expiringSoon,
        expired,
        byPlatform: byPlatform.map((p: any) => ({ platform: p.platform, count: p._count.id })),
      },
    });
  } catch (err) {
    console.error("[admin:social-channels:stats]", err);
    res.status(500).json({ error: "Failed to fetch social channel stats" });
  }
});

// =============================================================================
// DELETE /api/v1/admin/social-channels/:id
// Admin revoke — removes the channel connection for any tenant
// =============================================================================
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).user;

    const channel = await prisma.socialChannel.findUnique({
      where: { id },
      select: { id: true, tenantId: true, platform: true, accountName: true },
    });

    if (!channel) {
      return res.status(404).json({ error: "Social channel not found" });
    }

    await prisma.socialChannel.delete({ where: { id } });

    await auditLog(
      adminUser.userId,
      null, // admin action — no tenant scope
      "ADMIN_SOCIAL_CHANNEL_REVOKED",
      "SocialChannel",
      id,
      {
        targetTenantId: channel.tenantId,
        platform: channel.platform,
        accountName: channel.accountName,
      },
      req,
    );

    res.json({ message: `Channel "${channel.accountName}" (${channel.platform}) revoked successfully.` });
  } catch (err) {
    console.error("[admin:social-channels:revoke]", err);
    res.status(500).json({ error: "Failed to revoke social channel" });
  }
});

// =============================================================================
// PATCH /api/v1/admin/social-channels/:id/deactivate
// Soft-deactivate a channel without deleting it
// =============================================================================
router.patch("/:id/deactivate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).user;

    const channel = await prisma.socialChannel.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, tenantId: true, platform: true, accountName: true },
    });

    await auditLog(
      adminUser.userId,
      null,
      "ADMIN_SOCIAL_CHANNEL_DEACTIVATED",
      "SocialChannel",
      id,
      { targetTenantId: channel.tenantId, platform: channel.platform },
      req,
    );

    res.json({ message: "Channel deactivated.", data: channel });
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Social channel not found" });
    console.error("[admin:social-channels:deactivate]", err);
    res.status(500).json({ error: "Failed to deactivate channel" });
  }
});

export default router;
