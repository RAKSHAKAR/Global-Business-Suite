import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { CommunicationCenterService } from "../../services/communicationCenterService";
import { auditLog } from "../../services/auditLogger";

const router = Router();

// POST /api/v1/communication-center/send
router.post("/send", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.userId;
    const { channel, recipient, title, body, metadata } = req.body;

    if (!channel || !recipient || !title || !body) {
      return res.status(400).json({ error: "channel, recipient, title, and body are required" });
    }

    const result = await CommunicationCenterService.dispatchMessage({
      tenantId,
      userId,
      channel,
      recipient,
      title,
      body,
      metadata,
    });

    await auditLog(userId, tenantId, "UNIFIED_MESSAGE_DISPATCHED", "CentralNotificationLog", result.messageId, { channel, recipient }, req);

    res.json(result);
  } catch (err: any) {
    console.error("[communicationCenter:send]", err);
    res.status(500).json({ error: "Failed to dispatch communication" });
  }
});

// POST /api/v1/communication-center/broadcast
router.post("/broadcast", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.userId;
    const { channels, recipient, title, body, metadata } = req.body;

    if (!channels || !Array.isArray(channels) || !recipient || !title || !body) {
      return res.status(400).json({ error: "channels (array), recipient, title, and body are required" });
    }

    const result = await CommunicationCenterService.broadcastOmnichannel({
      tenantId,
      userId,
      channels,
      recipient,
      title,
      body,
      metadata,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to broadcast communication" });
  }
});

// GET /api/v1/communication-center/history
router.get("/history", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const history = await CommunicationCenterService.getHistory(tenantId);
    res.json({ success: true, count: history.length, data: history });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch communication history" });
  }
});

export default router;
