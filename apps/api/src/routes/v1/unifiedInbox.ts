import { Router, Request, Response } from "express";
import { UnifiedInboxService } from "../../services/unifiedInboxService";

export const unifiedInboxRouter = Router();

// GET /api/v1/inbox/conversations
unifiedInboxRouter.get("/conversations", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const channel = req.query.channel as string;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const folder = req.query.folder as string;
    const search = req.query.search as string;

    const conversations = await UnifiedInboxService.listConversations({
      tenantId,
      channel,
      status,
      priority,
      folder,
      search,
    });

    res.json({ success: true, count: conversations.length, data: conversations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/inbox/conversations
unifiedInboxRouter.post("/conversations", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const conversation = await UnifiedInboxService.createConversation({
      ...req.body,
      tenantId,
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/inbox/conversations/:id
unifiedInboxRouter.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const conversation = await UnifiedInboxService.getConversationDetails(req.params.id, tenantId);

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// POST /api/v1/inbox/conversations/:id/messages
unifiedInboxRouter.post("/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const message = await UnifiedInboxService.sendMessage({
      conversationId: req.params.id,
      ...req.body,
    });

    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/inbox/conversations/:id/ai-suggest
unifiedInboxRouter.post("/conversations/:id/ai-suggest", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const result = await UnifiedInboxService.generateAiSuggestedReply(req.params.id, tenantId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/inbox/conversations/:id/ai-summary
unifiedInboxRouter.post("/conversations/:id/ai-summary", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const result = await UnifiedInboxService.generateAiSummary(req.params.id, tenantId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/inbox/conversations/merge
unifiedInboxRouter.post("/conversations/merge", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const userId = req.body.userId || "system-user";
    const { targetId, sourceIds } = req.body;

    const result = await UnifiedInboxService.mergeConversations(targetId, sourceIds, userId, tenantId);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/inbox/providers
unifiedInboxRouter.get("/providers", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const providers = await UnifiedInboxService.listProviders(tenantId);

    res.json({ success: true, data: providers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/inbox/providers
unifiedInboxRouter.post("/providers", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const { providerKey, isEnabled, credentialsJson, settingsJson } = req.body;

    const config = await UnifiedInboxService.configureProvider(tenantId, providerKey, isEnabled, credentialsJson, settingsJson);

    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
