import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { idempotencyMiddleware } from "../../middleware/idempotency";
import { sendSuccess, sendError } from "../../utils/responseHandler";

export const socialPostsRouter = Router();

socialPostsRouter.use(authMiddleware);

/**
 * @swagger
 * /api/v1/social-posts:
 *   get:
 *     summary: List social posts for tenant
 *     tags: [SocialPosts]
 */
socialPostsRouter.get("/", requirePermission("social", "read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return sendError(res, "An authenticated tenant context is required", 403, "TENANT_CONTEXT_REQUIRED");
    }

    const posts = await prisma.socialPost.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, posts);
  } catch (error) {
    console.error("[socialPostsRouter:list]", error);
    return sendError(res, "Failed to fetch social posts", 500, "POST_FETCH_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/social-posts:
 *   post:
 *     summary: Create new social post (Idempotent)
 *     tags: [SocialPosts]
 */
socialPostsRouter.post("/", requirePermission("social", "create"), idempotencyMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const { content, platform, platforms, imageUrl, imageUrls, scheduledAt } = req.body;

    if (!tenantId) {
      return sendError(res, "An authenticated tenant context is required", 403, "TENANT_CONTEXT_REQUIRED");
    }
    if (typeof content !== "string" || !content.trim()) {
      return sendError(res, "content is required", 400, "VALIDATION_ERROR");
    }

    const requestedPlatforms = (Array.isArray(platforms) ? platforms : [platform])
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim());
    if (requestedPlatforms.length === 0) {
      return sendError(res, "At least one platform is required", 400, "VALIDATION_ERROR");
    }

    const requestedImageUrls = (Array.isArray(imageUrls) ? imageUrls : imageUrl ? [imageUrl] : [])
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim());
    const scheduleDate = scheduledAt ? new Date(scheduledAt) : undefined;
    if (scheduleDate && Number.isNaN(scheduleDate.getTime())) {
      return sendError(res, "scheduledAt must be a valid date", 400, "VALIDATION_ERROR");
    }

    const post = await prisma.socialPost.create({
      data: {
        content: content.trim(),
        platform: requestedPlatforms[0],
        platforms: JSON.stringify(requestedPlatforms),
        imageUrls: JSON.stringify(requestedImageUrls),
        scheduledAt: scheduleDate,
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
        createdByUserId: userId,
        tenantId,
      },
    });

    return sendSuccess(res, post, 201);
  } catch (error) {
    console.error("[socialPostsRouter:create]", error);
    return sendError(res, "Failed to create post", 500, "POST_CREATE_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/social-posts/{id}:
 *   put:
 *     summary: Update social post
 *     tags: [SocialPosts]
 */
socialPostsRouter.put("/:id", requirePermission("social", "create"), idempotencyMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return sendError(res, "An authenticated tenant context is required", 403, "TENANT_CONTEXT_REQUIRED");
    }

    const forbiddenWorkflowFields = [
      "status",
      "approvalStatus",
      "approvedByUserId",
      "rejectionReason",
      "publishedAt",
      "createdByUserId",
    ];
    if (forbiddenWorkflowFields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field))) {
      return sendError(
        res,
        "Workflow status and approval fields cannot be changed through this endpoint",
        400,
        "WORKFLOW_FIELDS_FORBIDDEN",
      );
    }

    const existing = await prisma.socialPost.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) return sendError(res, "Post not found", 404, "POST_NOT_FOUND");
    if (existing.status === "PUBLISHED") {
      return sendError(res, "Published posts cannot be edited", 409, "PUBLISHED_POST_IMMUTABLE");
    }

    const { content, platform, platforms, imageUrl, imageUrls, scheduledAt } = req.body;
    const hasContent = Object.prototype.hasOwnProperty.call(req.body, "content");
    const hasPlatforms = Object.prototype.hasOwnProperty.call(req.body, "platform") ||
      Object.prototype.hasOwnProperty.call(req.body, "platforms");
    const hasImageUrls = Object.prototype.hasOwnProperty.call(req.body, "imageUrl") ||
      Object.prototype.hasOwnProperty.call(req.body, "imageUrls");
    const hasScheduledAt = Object.prototype.hasOwnProperty.call(req.body, "scheduledAt");

    if (!hasContent && !hasPlatforms && !hasImageUrls && !hasScheduledAt) {
      return sendError(res, "No editable post fields were supplied", 400, "VALIDATION_ERROR");
    }
    if (hasContent && (typeof content !== "string" || !content.trim())) {
      return sendError(res, "content cannot be empty", 400, "VALIDATION_ERROR");
    }

    let requestedPlatforms: string[] | undefined;
    if (hasPlatforms) {
      requestedPlatforms = (Array.isArray(platforms) ? platforms : [platform])
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        .map((value) => value.trim());
      if (requestedPlatforms.length === 0) {
        return sendError(res, "At least one platform is required", 400, "VALIDATION_ERROR");
      }
    }

    let requestedImageUrls: string[] | undefined;
    if (hasImageUrls) {
      if (imageUrls !== undefined && !Array.isArray(imageUrls)) {
        return sendError(res, "imageUrls must be an array", 400, "VALIDATION_ERROR");
      }
      requestedImageUrls = (Array.isArray(imageUrls) ? imageUrls : imageUrl ? [imageUrl] : [])
        .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
        .map((value) => value.trim());
    }

    let scheduleDate: Date | null | undefined;
    if (hasScheduledAt) {
      scheduleDate = scheduledAt === null || scheduledAt === "" ? null : new Date(scheduledAt);
      if (scheduleDate && Number.isNaN(scheduleDate.getTime())) {
        return sendError(res, "scheduledAt must be a valid date", 400, "VALIDATION_ERROR");
      }
    }

    const updateData: any = {
      content: hasContent ? content.trim() : undefined,
      platform: requestedPlatforms?.[0],
      platforms: requestedPlatforms ? JSON.stringify(requestedPlatforms) : undefined,
      imageUrls: requestedImageUrls ? JSON.stringify(requestedImageUrls) : undefined,
      scheduledAt: scheduleDate,
      status: "PENDING_APPROVAL",
      approvalStatus: "PENDING",
      approvedByUserId: null,
      rejectionReason: null,
      publishedAt: null,
    };

    const mutation = await prisma.socialPost.updateMany({
      where: { id: req.params.id, tenantId },
      data: updateData,
    });
    if (mutation.count === 0) return sendError(res, "Post not found", 404, "POST_NOT_FOUND");

    const post = await prisma.socialPost.findFirst({ where: { id: req.params.id, tenantId } });

    return sendSuccess(res, post);
  } catch (error) {
    console.error("[socialPostsRouter:update]", error);
    return sendError(res, "Failed to update post", 500, "POST_UPDATE_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/social-posts/{id}:
 *   delete:
 *     summary: Delete social post
 *     tags: [SocialPosts]
 */
socialPostsRouter.delete("/:id", requirePermission("social", "create"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return sendError(res, "An authenticated tenant context is required", 403, "TENANT_CONTEXT_REQUIRED");
    }

    const deleted = await prisma.socialPost.deleteMany({ where: { id: req.params.id, tenantId } });
    if (deleted.count === 0) return sendError(res, "Post not found", 404, "POST_NOT_FOUND");
    return sendSuccess(res, { message: "Post deleted", postId: req.params.id });
  } catch (error) {
    console.error("[socialPostsRouter:delete]", error);
    return sendError(res, "Failed to delete post", 500, "POST_DELETE_ERROR");
  }
});
