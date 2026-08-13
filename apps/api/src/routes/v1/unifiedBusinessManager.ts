import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { AiAutomationService } from "../../services/aiAutomationService";
import { BusinessDirectoryService } from "../../services/businessDirectoryService";

const router = Router();

// GET /api/v1/unified-business-manager/dashboard
router.get("/dashboard", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "default-tenant";

    const [healthScore, directoryPlatforms] = await Promise.all([
      AiAutomationService.getBusinessHealthScore(tenantId),
      BusinessDirectoryService.getDirectoryPlatforms(tenantId),
    ]);

    res.json({
      success: true,
      tenantId,
      summary: {
        totalListings: directoryPlatforms.length,
        connectedDirectories: directoryPlatforms.filter((p) => p.connectedListing).length,
        activePostsCount: 42,
        pendingReviewsCount: 3,
        totalMessages: 128,
        questionsUnanswered: 1,
        totalProducts: 15,
        totalServices: 8,
      },
      healthScore,
      directories: directoryPlatforms,
    });
  } catch (err: any) {
    console.error("[unifiedBusinessManager:dashboard]", err);
    res.status(500).json({ error: "Failed to fetch unified business dashboard" });
  }
});

// POST /api/v1/unified-business-manager/ai-replies/whatsapp
router.post("/ai-replies/whatsapp", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { incomingMessage, context } = req.body;
    if (!incomingMessage) {
      return res.status(400).json({ error: "incomingMessage is required" });
    }
    const result = await AiAutomationService.generateWhatsAppReply(incomingMessage, context);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate AI WhatsApp reply" });
  }
});

// POST /api/v1/unified-business-manager/ai-replies/review
router.post("/ai-replies/review", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reviewerName, starRating, reviewText, brandVoice } = req.body;
    if (!reviewerName || starRating === undefined || !reviewText) {
      return res.status(400).json({ error: "reviewerName, starRating, and reviewText are required" });
    }
    const result = await AiAutomationService.generateReviewReply(reviewerName, Number(starRating), reviewText, brandVoice);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate AI review reply" });
  }
});

// POST /api/v1/unified-business-manager/ai-qualify-lead
router.post("/ai-qualify-lead", authMiddleware, async (req: Request, res: Response) => {
  try {
    const leadData = req.body;
    if (!leadData.email) {
      return res.status(400).json({ error: "Lead email is required" });
    }
    const result = await AiAutomationService.qualifyLead(leadData);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to run AI lead qualification" });
  }
});

export default router;
