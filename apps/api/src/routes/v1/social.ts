import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { auditLog } from "../../services/auditLogger";
import {
  publishToAllChannels,
  publishToChannel,
  type Platform,
  type PostPayload,
  type SocialChannelCredentials
} from "../../services/socialPublisher";

const router = Router();

function tenantId(req: Request): string {
  return (req as any).user?.tenantId || "";
}

// =============================================================================
// SOCIAL CHANNELS — OAuth-connected accounts per tenant
// =============================================================================

// GET /api/v1/social/channels
router.get("/channels", authMiddleware, requirePermission("social", "read"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const channels = await prisma.socialChannel.findMany({
      where: { tenantId: tid },
      select: {
        id: true, platform: true, accountId: true, accountName: true,
        accountAvatar: true, isActive: true, tokenExpiresAt: true,
        createdAt: true, updatedAt: true,
        // Never expose raw tokens in list response
      },
      orderBy: { platform: "asc" },
    });
    res.json({ data: channels });
  } catch (err) {
    console.error("[social:channels:list]", err);
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// POST /api/v1/social/channels — Manually connect a channel (for direct token input)
router.post("/channels", authMiddleware, requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { platform, accessToken, refreshToken, accountId, accountName, accountAvatar, tokenExpiresAt, scopes, metadata } = req.body;
    const supportedPlatforms = new Set([
      "FACEBOOK", "INSTAGRAM", "LINKEDIN", "TWITTER_X", "PINTEREST", "TIKTOK",
      "THREADS", "YOUTUBE", "GOOGLE_BUSINESS", "TELEGRAM", "WHATSAPP",
    ]);

    if (!platform || !accessToken || !accountId || !accountName) {
      return res.status(400).json({ error: "platform, accessToken, accountId, and accountName are required" });
    }
    if (!supportedPlatforms.has(String(platform).toUpperCase())) {
      return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    const channel = await prisma.socialChannel.upsert({
      where: { tenantId_platform_accountId: { tenantId: tid, platform, accountId } },
      update: { accessToken, refreshToken, accountName, accountAvatar, tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null, isActive: true, metadata: metadata ? JSON.stringify(metadata) : "{}" },
      create: {
        tenantId: tid, platform, accessToken, refreshToken, accountId,
        accountName, accountAvatar, scopes: JSON.stringify(scopes || []),
        tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        metadata: metadata ? JSON.stringify(metadata) : "{}",
      },
    });

    await auditLog((req as any).user?.userId, tid, "SOCIAL_CHANNEL_CONNECTED", "SocialChannel", channel.id, { platform, accountName }, req);
    const { accessToken: _, refreshToken: __, ...safeChannel } = channel;
    res.status(201).json(safeChannel);
  } catch (err) {
    console.error("[social:channels:connect]", err);
    res.status(500).json({ error: "Failed to connect channel" });
  }
});

// GET /api/v1/social/channels/oauth-url/:platform — Get OAuth URL for a platform
router.get("/channels/oauth-url/:platform", authMiddleware, requirePermission("social", "create"), async (req: Request, res: Response) => {
  const platform = String(req.params.platform || "").toUpperCase();
  const requiredCredentials: Record<string, string[]> = {
    FACEBOOK: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    INSTAGRAM: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    LINKEDIN: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
    TWITTER_X: ["TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
    PINTEREST: ["PINTEREST_APP_ID", "PINTEREST_APP_SECRET"],
    TIKTOK: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    THREADS: ["THREADS_APP_ID", "THREADS_APP_SECRET"],
    YOUTUBE: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  };
  const required = requiredCredentials[platform];
  if (!required) return res.status(400).json({ error: `Unsupported OAuth platform: ${platform}` });
  const missing = required.filter((key) => !process.env[key]);
  return res.status(missing.length ? 503 : 501).json({
    error: missing.length
      ? `${platform} OAuth credentials are not configured.`
      : `${platform} OAuth token exchange is not enabled in this build. Use a verified direct-token connection until its provider adapter is configured.`,
    code: missing.length ? "OAUTH_PROVIDER_NOT_CONFIGURED" : "OAUTH_TOKEN_EXCHANGE_NOT_IMPLEMENTED",
    platform,
    missing,
  });
});

// GET /api/v1/social/channels/callback/:platform — OAuth callback (redirect-based)
router.get("/channels/callback/:platform", async (req: Request, res: Response) => {
  const platform = String(req.params.platform || "").replace(/[^A-Z0-9_-]/gi, "");
  return res.status(501).type("html").send(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><title>Connection unavailable</title></head>
    <body style="font-family:system-ui;text-align:center;padding:60px;background:#0f172a;color:#fff">
      <main style="max-width:520px;margin:0 auto">
        <h1 style="color:#f59e0b">${platform || "Social"} connection not completed</h1>
        <p style="color:#cbd5e1">No token was stored. This provider requires a verified server-side OAuth exchange before it can be marked connected.</p>
      </main>
    </body></html>`);
});

// DELETE /api/v1/social/channels/:id
router.delete("/channels/:id", authMiddleware, requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    await prisma.socialChannel.deleteMany({ where: { id: req.params.id, tenantId: tid } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to disconnect channel" });
  }
});

// =============================================================================
// SOCIAL POSTS — Multi-platform content management
// =============================================================================

// GET /api/v1/social/posts
router.get("/posts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(100, parseInt(String(req.query.limit || "20")));
    const status = req.query.status as string | undefined;
    const platform = req.query.platform as string | undefined;

    const where: Record<string, any> = { tenantId: tid };
    if (status) where.status = status;
    if (platform) where.platforms = { contains: platform };

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        include: { platformResults: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.socialPost.count({ where }),
    ]);

    res.json({ data: posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("[social:posts:list]", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// POST /api/v1/social/posts — Create a new post
router.post("/posts", authMiddleware, requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const userId = (req as any).user?.userId;
    const { content, platforms, imageUrls, videoUrl, hashtags, linkUrl, scheduledAt } = req.body;

    if (!content) return res.status(400).json({ error: "content is required" });
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: "platforms array is required" });
    }

    const post = await prisma.socialPost.create({
      data: {
        tenantId: tid,
        content,
        platforms: JSON.stringify(platforms),
        platform: platforms[0] || "MULTI",
        imageUrls: JSON.stringify(imageUrls || []),
        videoUrl,
        hashtags: JSON.stringify(hashtags || []),
        linkUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
        createdByUserId: userId,
      },
      include: { platformResults: true },
    });

    await auditLog(userId, tid, "SOCIAL_POST_CREATED", "SocialPost", post.id, { platforms, status: post.status }, req);
    res.status(201).json(post);
  } catch (err) {
    console.error("[social:posts:create]", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// PUT /api/v1/social/posts/:id
router.put("/posts/:id", authMiddleware, requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { content, platforms, imageUrls, videoUrl, hashtags, linkUrl, scheduledAt } = req.body;

    const existing = await prisma.socialPost.findFirst({ where: { id: req.params.id, tenantId: tid } });
    if (!existing) return res.status(404).json({ error: "Post not found" });
    if (existing.status === "PUBLISHED") return res.status(400).json({ error: "Cannot edit a published post" });

    const updated = await prisma.socialPost.update({
      where: { id: req.params.id },
      data: {
        content,
        platforms: platforms ? JSON.stringify(platforms) : undefined,
        platform: platforms ? platforms[0] : undefined,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : undefined,
        videoUrl,
        hashtags: hashtags ? JSON.stringify(hashtags) : undefined,
        linkUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
        approvedByUserId: null,
        rejectionReason: null,
      },
      include: { platformResults: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update post" });
  }
});

// DELETE /api/v1/social/posts/:id
router.delete("/posts/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    await prisma.socialPost.deleteMany({ where: { id: req.params.id, tenantId: tid } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// POST /api/v1/social/posts/:id/publish — Publish immediately
router.post("/posts/:id/publish", authMiddleware, requirePermission("social", "publish"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const post = await prisma.socialPost.findFirst({
      where: { id: req.params.id, tenantId: tid },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.approvalStatus !== "APPROVED") {
      return res.status(409).json({
        error: "This post must be approved before it can be published.",
        code: "SOCIAL_POST_APPROVAL_REQUIRED",
        approvalStatus: post.approvalStatus,
      });
    }
    if (["PUBLISHING", "PUBLISHED"].includes(post.status)) {
      return res.status(409).json({ error: `Post is already ${post.status.toLowerCase()}.` });
    }

    const platforms: Platform[] = JSON.parse(post.platforms || "[]");
    if (platforms.length === 0) return res.status(400).json({ error: "No platforms selected" });

    // Get connected channels for the requested platforms
    const channels = await prisma.socialChannel.findMany({
      where: { tenantId: tid, platform: { in: platforms }, isActive: true },
    });
    if (channels.length === 0) {
      return res.status(409).json({
        error: "Connect at least one selected social channel before publishing.",
        code: "SOCIAL_CHANNEL_REQUIRED",
        missingPlatforms: platforms,
      });
    }
    const connectedPlatforms = new Set(channels.map((channel) => channel.platform));
    const missingPlatforms = platforms.filter((platform) => !connectedPlatforms.has(platform));
    if (missingPlatforms.length) {
      return res.status(409).json({
        error: "Every selected platform must have an active connected channel before publishing.",
        code: "SOCIAL_CHANNELS_INCOMPLETE",
        missingPlatforms,
      });
    }

    // Update post status to PUBLISHING
    await prisma.socialPost.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });

    const payload: PostPayload = {
      content: post.content,
      imageUrls: JSON.parse(post.imageUrls || "[]"),
      videoUrl: post.videoUrl || undefined,
      hashtags: JSON.parse(post.hashtags || "[]"),
      linkUrl: post.linkUrl || undefined,
    };

    // Publish to all connected channels in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await publishToAllChannels(channels as any[], payload);

    // Save per-platform results
    await prisma.socialPostPlatformResult.createMany({
      data: results.map((r) => ({
        postId: post.id,
        platform: r.platform,
        channelId: r.channelId,
        status: r.status,
        externalPostId: r.externalPostId,
        externalUrl: r.externalUrl,
        error: r.error,
        publishedAt: r.publishedAt,
      })),
    });

    // Determine final status
    const allPublished = results.length > 0 && results.every((r) => r.status === "PUBLISHED");
    const anyPublished = results.some((r) => r.status === "PUBLISHED");
    const finalStatus = allPublished ? "PUBLISHED" : anyPublished ? "PARTIALLY_PUBLISHED" : "FAILED";

    const updated = await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: finalStatus, publishedAt: anyPublished ? new Date() : undefined },
      include: { platformResults: true },
    });

    await auditLog((req as any).user?.userId, tid, "SOCIAL_POST_PUBLISHED", "SocialPost", post.id, { platforms, finalStatus }, req);
    res.json({ post: updated, results, summary: { total: results.length, published: results.filter((r) => r.status === "PUBLISHED").length, failed: results.filter((r) => r.status === "FAILED").length } });
  } catch (err) {
    console.error("[social:posts:publish]", err);
    res.status(500).json({ error: "Failed to publish post" });
  }
});

// POST /api/v1/social/posts/bulk-schedule
router.post("/posts/bulk-schedule", authMiddleware, requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const userId = (req as any).user?.userId;
    const { posts } = req.body; // Array of { content, platforms, scheduledAt, imageUrls, hashtags }
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: "posts array is required" });
    }

    const created = await Promise.all(
      posts.map((p) =>
        prisma.socialPost.create({
          data: {
            tenantId: tid,
            content: p.content,
            platforms: JSON.stringify(p.platforms || []),
            platform: (p.platforms || [])[0] || "MULTI",
            imageUrls: JSON.stringify(p.imageUrls || []),
            hashtags: JSON.stringify(p.hashtags || []),
            scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : undefined,
            status: "PENDING_APPROVAL",
            approvalStatus: "PENDING",
            createdByUserId: userId,
          },
        }),
      ),
    );

    res.status(201).json({ created: created.length, posts: created });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk schedule posts" });
  }
});

// GET /api/v1/social/analytics
router.get("/analytics", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const days = parseInt(String(req.query.days || "30"));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalPosts, publishedPosts, scheduledPosts, recentResults] = await Promise.all([
      prisma.socialPost.count({ where: { tenantId: tid } }),
      prisma.socialPost.count({ where: { tenantId: tid, status: "PUBLISHED", publishedAt: { gte: since } } }),
      prisma.socialPost.count({ where: { tenantId: tid, status: "SCHEDULED" } }),
      prisma.socialPostPlatformResult.findMany({
        where: { post: { tenantId: tid }, publishedAt: { gte: since } },
        include: { post: { select: { content: true, publishedAt: true } } },
      }),
    ]);

    // Per-platform breakdown
    const platformBreakdown = recentResults.reduce((acc: Record<string, { published: number; failed: number }>, r) => {
      if (!acc[r.platform]) acc[r.platform] = { published: 0, failed: 0 };
      if (r.status === "PUBLISHED") acc[r.platform].published++;
      else if (r.status === "FAILED") acc[r.platform].failed++;
      return acc;
    }, {});

    res.json({
      summary: { totalPosts, publishedPosts, scheduledPosts, days },
      platformBreakdown,
      recentPublishes: recentResults.slice(0, 20),
    });
  } catch (err) {
    console.error("[social:analytics]", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// =============================================================================
// PHASE 11: APPROVAL WORKFLOWS & VERSION HISTORY
// =============================================================================

// POST /api/v1/social/posts/:id/approve — Approve a post for publishing
router.post("/posts/:id/approve", authMiddleware, requirePermission("social", "approve"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const userId = (req as any).user?.userId;
    const post = await prisma.socialPost.findFirst({ where: { id: req.params.id, tenantId: tid } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.approvalStatus === "APPROVED") {
      return res.status(409).json({ error: "Post is already approved." });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.approvalRequest.updateMany({
        where: { resourceType: "SocialPost", resourceId: post.id, tenantId: tid, status: "PENDING" },
        data: { status: "APPROVED", comments: req.body?.comments || "Content approved for publishing." },
      });
      return tx.socialPost.update({
        where: { id: post.id },
        data: {
          approvalStatus: "APPROVED",
          approvedByUserId: userId,
          rejectionReason: null,
          status: post.scheduledAt ? "SCHEDULED" : "DRAFT",
        },
      });
    });

    await auditLog(userId, tid, "SOCIAL_POST_APPROVED", "SocialPost", post.id, { approvedBy: userId }, req);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to approve post" });
  }
});

// POST /api/v1/social/posts/:id/reject — Reject a post with reason
router.post("/posts/:id/reject", authMiddleware, requirePermission("social", "approve"), async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const userId = (req as any).user?.userId;
    const { reason } = req.body;
    const post = await prisma.socialPost.findFirst({ where: { id: req.params.id, tenantId: tid } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.approvalStatus === "REJECTED") {
      return res.status(409).json({ error: "Post is already rejected." });
    }

    const rejectionReason = typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 2_000) : "Rejected by reviewer";
    const updated = await prisma.$transaction(async (tx) => {
      await tx.approvalRequest.updateMany({
        where: { resourceType: "SocialPost", resourceId: post.id, tenantId: tid, status: "PENDING" },
        data: { status: "REJECTED", comments: rejectionReason },
      });
      return tx.socialPost.update({
        where: { id: post.id },
        data: {
          approvalStatus: "REJECTED",
          rejectionReason,
          approvedByUserId: null,
          status: "DRAFT",
        },
      });
    });

    await auditLog(userId, tid, "SOCIAL_POST_REJECTED", "SocialPost", post.id, { reason }, req);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to reject post" });
  }
});

// GET /api/v1/social/posts/:id/versions — Fetch version history
router.get("/posts/:id/versions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const versions = await prisma.socialPostVersion.findMany({
      where: { post: { id: req.params.id, tenantId: tid } },
      orderBy: { versionNumber: "desc" },
    });
    res.json({ data: versions });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post version history" });
  }
});

// POST /api/v1/social/posts/bulk-delete — Delete multiple posts
router.post("/posts/bulk-delete", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }

    const result = await prisma.socialPost.deleteMany({
      where: { id: { in: ids }, tenantId: tid },
    });

    res.json({ deleted: result.count });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk delete posts" });
  }
});

// =============================================================================
// PHASE 11: MEDIA LIBRARY ASSETS
// =============================================================================

// GET /api/v1/social/media — List media library assets
router.get("/media", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const assets = await prisma.socialMediaAsset.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: assets });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch media assets" });
  }
});

// POST /api/v1/social/media — Add media asset to library
router.post("/media", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { name, fileUrl, fileType, fileSize, mimeType, category, tags, isBrandAsset, isAiGenerated } = req.body;
    if (!name || !fileUrl || !fileType) {
      return res.status(400).json({ error: "name, fileUrl, and fileType are required" });
    }

    const asset = await prisma.socialMediaAsset.create({
      data: {
        tenantId: tid,
        name,
        fileUrl,
        fileType,
        fileSize: fileSize || 0,
        mimeType,
        category: category || "GENERAL",
        tagsJson: JSON.stringify(tags || []),
        isBrandAsset: Boolean(isBrandAsset),
        isAiGenerated: Boolean(isAiGenerated),
      },
    });

    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ error: "Failed to create media asset" });
  }
});

export default router;
