import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { SocialListeningService } from "../../services/socialListeningService";
import { auditLog } from "../../services/auditLogger";

const router = Router();

function tenantId(req: Request): string {
  return (req as any).user?.tenantId || "";
}

// GET /api/v1/social/listening/monitors — List all social listening monitors
router.get("/monitors", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const monitors = await SocialListeningService.getMonitors(tid);
    res.json({ data: monitors });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch social listening monitors" });
  }
});

// POST /api/v1/social/listening/monitors — Create a new social listening monitor
router.post("/monitors", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { name, keywords, competitors } = req.body;
    if (!name || !keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: "name and keywords array are required" });
    }

    const monitor = await SocialListeningService.createMonitor({
      tenantId: tid,
      name,
      keywords,
      competitors: competitors || [],
    });

    await auditLog((req as any).user?.userId, tid, "SOCIAL_LISTENING_MONITOR_CREATED", "SocialListeningMonitor", monitor.id, { name, keywords }, req);
    res.status(201).json(monitor);
  } catch (err) {
    res.status(500).json({ error: "Failed to create social listening monitor" });
  }
});

// POST /api/v1/social/listening/mentions — Record a web/social brand mention
router.post("/mentions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { monitorId, platform, authorName, content, url } = req.body;
    if (!monitorId || !platform || !content) {
      return res.status(400).json({ error: "monitorId, platform, and content are required" });
    }

    const mention = await SocialListeningService.recordMention({
      monitorId,
      tenantId: tid,
      platform,
      authorName: authorName || "Social Web",
      content,
      url,
    });

    res.status(201).json(mention);
  } catch (err) {
    res.status(500).json({ error: "Failed to record mention" });
  }
});

export default router;
