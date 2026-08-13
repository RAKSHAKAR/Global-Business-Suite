import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";

const router = Router();

// GET /api/v1/posts
// Fetch scheduled posts for a tenant
router.get("/", authMiddleware, requirePermission("social", "read"), async (req: any, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(403).json({
      error: "An authenticated tenant context is required",
      code: "TENANT_CONTEXT_REQUIRED",
    });
  }

  try {
    const posts = await prisma.socialPost.findMany({
      where: { tenantId },
      orderBy: { scheduledAt: "asc" },
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// POST /api/v1/posts/schedule
// Schedule a new post
router.post("/schedule", authMiddleware, requirePermission("social", "create"), async (req: any, res) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId || req.user?.id;
  const { content, imageUrl, imageUrls, platform, platforms, scheduledTime } = req.body;

  if (!tenantId) {
    return res.status(403).json({
      error: "An authenticated tenant context is required",
      code: "TENANT_CONTEXT_REQUIRED",
    });
  }

  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "content is required", code: "VALIDATION_ERROR" });
  }

  const requestedPlatforms = (Array.isArray(platforms) ? platforms : [platform])
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.trim());
  if (requestedPlatforms.length === 0) {
    return res.status(400).json({ error: "At least one platform is required", code: "VALIDATION_ERROR" });
  }

  const requestedImageUrls = (Array.isArray(imageUrls) ? imageUrls : imageUrl ? [imageUrl] : [])
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .map((value) => value.trim());
  const scheduleDate = scheduledTime ? new Date(scheduledTime) : new Date();
  if (Number.isNaN(scheduleDate.getTime())) {
    return res.status(400).json({ error: "scheduledTime must be a valid date", code: "VALIDATION_ERROR" });
  }

  try {
    const post = await prisma.socialPost.create({
      data: {
        tenantId,
        content: content.trim(),
        platform: requestedPlatforms[0],
        platforms: JSON.stringify(requestedPlatforms),
        imageUrls: JSON.stringify(requestedImageUrls),
        scheduledAt: scheduleDate,
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
        createdByUserId: userId,
      },
    });

    // In a real scenario, this would queue a BullMQ job that executes at `scheduledTime`
    // e.g. await publishQueue.add('publish-post', { postId: post.id }, { delay: ... });

    res.status(201).json(post);
  } catch (error) {
    console.error("Error scheduling post:", error);
    res.status(500).json({ error: "Failed to schedule post" });
  }
});

export default router;
