import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { SocialEngagementService } from "../../services/socialEngagementService";
import { auditLog } from "../../services/auditLogger";

const router = Router();

function tenantId(req: Request): string {
  return (req as any).user?.tenantId || "";
}

// GET /api/v1/social/engagement/inbox — List unified inbox threads
router.get("/inbox", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const threads = await prisma.socialEngagementInbox.findMany({
      where: { tenantId: tid },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 20 } },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ data: threads });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

// POST /api/v1/social/engagement/inbox/messages — Add inbound/outbound message
router.post("/inbox/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { platform, conversationId, senderName, senderAvatar, senderId, messageText, mediaUrl } = req.body;
    if (!platform || !conversationId || !messageText) {
      return res.status(400).json({ error: "platform, conversationId, and messageText are required" });
    }

    const message = await SocialEngagementService.addMessage({
      tenantId: tid,
      platform,
      conversationId,
      senderName: senderName || "Customer",
      senderAvatar,
      senderId: senderId || "user_123",
      messageText,
      mediaUrl,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: "Failed to record message" });
  }
});

// GET /api/v1/social/engagement/comments — List comment threads
router.get("/comments", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const comments = await prisma.socialComment.findMany({
      where: { tenantId: tid },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: comments });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST /api/v1/social/engagement/comments — Record new comment
router.post("/comments", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { platform, channelId, postId, externalCommentId, authorName, authorAvatar, content } = req.body;
    if (!platform || !content) return res.status(400).json({ error: "platform and content required" });

    const comment = await SocialEngagementService.addComment({
      tenantId: tid,
      platform,
      channelId,
      postId,
      externalCommentId,
      authorName: authorName || "Anonymous",
      authorAvatar,
      content,
    });

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// POST /api/v1/social/engagement/comments/:id/moderate — Moderate comment (reply, hide, delete)
router.post("/comments/:id/moderate", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { action, replyText } = req.body;
    if (!action || !["REPLY", "HIDE", "DELETE"].includes(action)) {
      return res.status(400).json({ error: "Valid action (REPLY, HIDE, DELETE) required" });
    }

    const comment = await SocialEngagementService.moderateComment(req.params.id, action, replyText);
    await auditLog((req as any).user?.userId, tid, "SOCIAL_COMMENT_MODERATED", "SocialComment", comment.id, { action, replyText }, req);
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to moderate comment" });
  }
});

export default router;
