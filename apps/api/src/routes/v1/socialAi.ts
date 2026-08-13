import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { auditLog } from "../../services/auditLogger";
import { SocialAiStudioService } from "../../services/socialAiStudioService";
import {
  AiProviderConfigurationError,
  AiProviderRequestError,
  SocialContentPackageService,
} from "../../services/socialContentPackageService";

const router = Router();

function tenantId(req: Request): string {
  return (req as any).user?.tenantId || "";
}

function userId(req: Request): string {
  return (req as any).user?.userId || (req as any).user?.id || "";
}

async function ensureSocialApprovalWorkflow(tx: any, tid: string) {
  const existing = await tx.approvalWorkflow.findFirst({
    where: {
      triggerType: "SOCIAL_POST_PUBLISH",
      isActive: true,
      OR: [{ tenantId: tid }, { tenantId: null }],
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return tx.approvalWorkflow.create({
    data: {
      name: "Social content publishing approval",
      triggerType: "SOCIAL_POST_PUBLISH",
      description: "Generated social content must be reviewed before it can be published.",
      tenantId: tid,
      steps: {
        create: [{ stepNumber: 1, title: "Review generated copy and image", requiredRole: "PARTNER" }],
      },
    },
    include: { steps: true },
  });
}

function handleProviderError(error: unknown, res: Response, fallback: string) {
  if (error instanceof AiProviderConfigurationError || error instanceof AiProviderRequestError) {
    return res.status(error.status).json({ success: false, error: error.message, code: error.code });
  }
  console.error(`[social:ai] ${fallback}`, error);
  return res.status(500).json({ success: false, error: fallback });
}

// GET /api/v1/social/ai/provider-status — safe configuration readiness (never returns secrets)
router.get("/provider-status", authMiddleware, (_req: Request, res: Response) => {
  res.json(SocialContentPackageService.providerStatus());
});

// POST /api/v1/social/ai/content-package — generate copy + image and submit both for approval
router.post(
  "/content-package",
  authMiddleware,
  requirePermission("social", "create"),
  async (req: Request, res: Response) => {
    try {
      const tid = tenantId(req);
      const requesterId = userId(req);
      const {
        topic,
        platforms,
        tone,
        brandVoice,
        callToAction,
        imageStyle,
        aspectRatio,
        imageSize,
        feedback,
        revisionOfPostId,
        scheduledAt,
      } = req.body || {};

      if (!tid) return res.status(400).json({ success: false, error: "A tenant-scoped account is required." });
      if (!requesterId) return res.status(401).json({ success: false, error: "Authentication required." });
      if (typeof topic !== "string" || !topic.trim()) {
        return res.status(400).json({ success: false, error: "topic is required" });
      }
      if (topic.trim().length > 2_000) {
        return res.status(400).json({ success: false, error: "topic must be 2,000 characters or fewer" });
      }

      const selectedPlatforms = SocialContentPackageService.normalizePlatforms(platforms);
      if (!selectedPlatforms.length) {
        return res.status(400).json({ success: false, error: "Select at least one publishing platform." });
      }

      const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
      if (scheduledAt && Number.isNaN(scheduledDate?.getTime())) {
        return res.status(400).json({ success: false, error: "scheduledAt must be a valid date." });
      }

      const previous = revisionOfPostId
        ? await prisma.socialPost.findFirst({ where: { id: revisionOfPostId, tenantId: tid } })
        : null;
      if (revisionOfPostId && !previous) {
        return res.status(404).json({ success: false, error: "Post to revise was not found." });
      }
      if (previous?.status === "PUBLISHED") {
        return res.status(409).json({ success: false, error: "Published posts cannot be regenerated." });
      }

      const generated = await SocialContentPackageService.generate({
        tenantId: tid,
        userId: requesterId,
        topic: topic.trim(),
        platforms: selectedPlatforms,
        tone,
        brandVoice,
        callToAction,
        imageStyle,
        aspectRatio,
        imageSize,
        feedback,
      });
      const image = await SocialContentPackageService.persistImage(tid, generated.imageBase64, generated.mimeType);
      const hashtags = generated.caption.match(/#[\p{L}\p{N}_]+/gu) || [];

      const result = await prisma.$transaction(async (tx) => {
        const workflow = await ensureSocialApprovalWorkflow(tx, tid);
        const media = await tx.socialMediaAsset.create({
          data: {
            tenantId: tid,
            name: `AI ${topic.trim().slice(0, 80)}`,
            fileUrl: image.fileUrl,
            fileType: "AI_GENERATED",
            fileSize: image.fileSize,
            mimeType: image.mimeType,
            category: "SOCIAL",
            tagsJson: JSON.stringify(hashtags),
            isAiGenerated: true,
          },
        });

        let post: any;
        if (previous) {
          await tx.socialPostVersion.create({
            data: {
              postId: previous.id,
              versionNumber: previous.version,
              content: previous.content,
              platforms: previous.platforms,
              imageUrls: previous.imageUrls,
              videoUrl: previous.videoUrl,
              editedByUserId: requesterId,
            },
          });
          post = await tx.socialPost.update({
            where: { id: previous.id },
            data: {
              content: generated.caption,
              platforms: JSON.stringify(selectedPlatforms),
              platform: selectedPlatforms[0],
              imageUrls: JSON.stringify([image.fileUrl]),
              hashtags: JSON.stringify(hashtags),
              aiPromptUsed: topic.trim(),
              brandVoice: brandVoice || null,
              approvalStatus: "PENDING",
              approvedByUserId: null,
              rejectionReason: null,
              status: "PENDING_APPROVAL",
              scheduledAt: scheduledDate,
              version: { increment: 1 },
            },
          });
          await tx.approvalRequest.updateMany({
            where: { resourceType: "SocialPost", resourceId: previous.id, tenantId: tid, status: "PENDING" },
            data: { status: "REJECTED", comments: "Superseded by regenerated content." },
          });
        } else {
          post = await tx.socialPost.create({
            data: {
              tenantId: tid,
              content: generated.caption,
              platforms: JSON.stringify(selectedPlatforms),
              platform: selectedPlatforms[0],
              imageUrls: JSON.stringify([image.fileUrl]),
              hashtags: JSON.stringify(hashtags),
              aiPromptUsed: topic.trim(),
              brandVoice,
              approvalStatus: "PENDING",
              status: "PENDING_APPROVAL",
              scheduledAt: scheduledDate,
              createdByUserId: requesterId,
            },
          });
        }

        const approvalRequest = await tx.approvalRequest.create({
          data: {
            workflowId: workflow.id,
            requesterId,
            resourceType: "SocialPost",
            resourceId: post.id,
            tenantId: tid,
            status: "PENDING",
            currentStep: 1,
            comments: feedback ? `Generated revision: ${String(feedback).slice(0, 1_000)}` : "AI copy and image ready for review.",
          },
          include: { workflow: { include: { steps: true } } },
        });

        return { post, media, approvalRequest };
      });

      await auditLog(
        requesterId,
        tid,
        previous ? "SOCIAL_AI_PACKAGE_REGENERATED" : "SOCIAL_AI_PACKAGE_GENERATED",
        "SocialPost",
        result.post.id,
        { provider: generated.provider, model: generated.model, platforms: selectedPlatforms },
        req,
      );

      return res.status(previous ? 200 : 201).json({
        success: true,
        ...result,
        generation: {
          provider: generated.provider,
          model: generated.model,
          interactionId: generated.interactionId,
        },
        nextAction: "REVIEW_AND_APPROVE",
      });
    } catch (error) {
      return handleProviderError(error, res, "Failed to generate the social content package.");
    }
  },
);

// POST /api/v1/social/ai/caption — AI Caption Generator
router.post("/caption", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { topic, platform, brandVoice, tone, includeHashtags, includeCallToAction } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    const result = await SocialAiStudioService.generateCaption({
      tenantId: tid,
      topic,
      platform,
      brandVoice,
      tone,
      includeHashtags,
      includeCallToAction,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate AI caption" });
  }
});

// POST /api/v1/social/ai/hashtags — AI Hashtag Generator
router.post("/hashtags", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { topic, count } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    const hashtags = await SocialAiStudioService.generateHashtags(topic, count || 10);
    res.json({ hashtags });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate AI hashtags" });
  }
});

// POST /api/v1/social/ai/campaign-plan — AI Campaign Generator
router.post("/campaign-plan", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { topic, durationDays } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    const plan = await SocialAiStudioService.generateCampaignPlan(topic, durationDays || 30);
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate campaign plan" });
  }
});

// GET /api/v1/social/ai/best-time — AI Best Time to Post Recommendation
router.get("/best-time", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const platform = (req.query.platform as string) || "MULTI";
    const recommendation = await SocialAiStudioService.getBestTimeToPost(tid, platform);
    res.json(recommendation);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch best time to post" });
  }
});

// POST /api/v1/social/ai/poster — AI Branded Poster & Image Generator
router.post("/poster", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { topic, platform, style, headline, subheadline, ctaText, customLogoUrl, customFaviconUrl, watermarkPosition, includeBrandLogo } = req.body;
    if (!topic) return res.status(400).json({ error: "topic is required" });

    const result = await SocialAiStudioService.generatePoster({
      tenantId: tid,
      topic,
      platform,
      style,
      headline,
      subheadline,
      ctaText,
      customLogoUrl,
      customFaviconUrl,
      watermarkPosition,
      includeBrandLogo,
    });

    res.json(result);
  } catch (err: any) {
    console.error("Failed to generate AI poster:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI poster" });
  }
});

export default router;
