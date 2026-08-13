import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { WhatsAppPlatformService } from "../../services/whatsAppPlatformService";
import { auditLog } from "../../services/auditLogger";

const router = Router();

// GET /api/v1/whatsapp-marketing/config
router.get("/config", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "default-tenant";
    const config = await WhatsAppPlatformService.getConfig(tenantId);
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch WhatsApp config" });
  }
});

// POST /api/v1/whatsapp-marketing/send-message
router.post("/send-message", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "default-tenant";
    const { phoneNumber, messageText, mediaUrl, templateId } = req.body;

    if (!phoneNumber || !messageText) {
      return res.status(400).json({ error: "phoneNumber and messageText are required" });
    }

    const result = await WhatsAppPlatformService.sendMessage({
      tenantId,
      phoneNumber,
      messageText,
      mediaUrl,
      templateId,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to send WhatsApp message" });
  }
});

// POST /api/v1/whatsapp-marketing/campaigns
router.post("/campaigns", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "default-tenant";
    const { name, campaignType, templateId, messageContent, mediaUrl, audienceFilter, scheduledAt, abVariantId } = req.body;

    if (!name || !messageContent) {
      return res.status(400).json({ error: "name and messageContent are required" });
    }

    const campaign = await WhatsAppPlatformService.createCampaign({
      tenantId,
      name,
      campaignType,
      templateId,
      messageContent,
      mediaUrl,
      audienceFilter,
      scheduledAt,
      abVariantId,
    });

    await auditLog((req as any).user?.userId, tenantId, "WHATSAPP_CAMPAIGN_CREATED", "WhatsAppMarketingCampaign", (campaign as any).id, { name }, req);

    res.status(201).json({ success: true, data: campaign });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create WhatsApp campaign" });
  }
});

// GET /api/v1/whatsapp-marketing/analytics
router.get("/analytics", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "default-tenant";
    const analytics = await WhatsAppPlatformService.getCampaignAnalytics(tenantId);
    res.json({ success: true, data: analytics });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch campaign analytics" });
  }
});

// POST /api/v1/whatsapp-marketing/consent
router.post("/consent", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "default-tenant";
    const { phoneNumber, consentStatus, source } = req.body;

    if (!phoneNumber || !consentStatus) {
      return res.status(400).json({ error: "phoneNumber and consentStatus required" });
    }

    const consent = await WhatsAppPlatformService.setConsent(tenantId, phoneNumber, consentStatus, source);
    res.json({ success: true, data: consent });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update consent status" });
  }
});

export default router;
