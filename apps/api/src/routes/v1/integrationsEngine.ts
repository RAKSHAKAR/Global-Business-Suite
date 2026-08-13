import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { prisma } from "@saas/database";
import crypto from "crypto";

export const integrationsEngineRouter = Router();

// GET /api/v1/admin/integrations/api-keys - List API Keys
integrationsEngineRouter.get(
  "/api-keys",
  authMiddleware,
  requirePermission("settings", "read"),
  async (req: Request, res: Response) => {
    try {
      const apiKeys = await (prisma as any).apiKey.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json({ apiKeys });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  }
);

// POST /api/v1/admin/integrations/api-keys - Generate new API Key
integrationsEngineRouter.post(
  "/api-keys",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { name, rateLimit, scopes } = req.body;

      if (!name) {
        return res.status(400).json({ error: "API Key Name is required" });
      }

      const rawKey = `gbs_live_${crypto.randomBytes(24).toString("hex")}`;
      const prefix = rawKey.substring(0, 12);
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

      const apiKeyRecord = await (prisma as any).apiKey.create({
        data: {
          name,
          keyHash,
          prefix,
          rateLimit: parseInt(rateLimit) || 1000,
          scopesJson: JSON.stringify(scopes || ["*"]),
          tenantId: user.tenantId,
        },
      });

      res.status(201).json({
        apiKey: apiKeyRecord,
        rawKey, // Returned ONLY ONCE upon creation
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to generate API key", details: error?.message });
    }
  }
);

// GET /api/v1/admin/integrations/webhooks - List Webhook Subscriptions
integrationsEngineRouter.get(
  "/webhooks",
  authMiddleware,
  requirePermission("settings", "read"),
  async (_req: Request, res: Response) => {
    try {
      const webhooks = await (prisma as any).webhookSubscription.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json({ webhooks });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  }
);

// POST /api/v1/admin/integrations/webhooks - Create Webhook Subscription
integrationsEngineRouter.post(
  "/webhooks",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { targetUrl, events } = req.body;

      if (!targetUrl) {
        return res.status(400).json({ error: "Target Webhook URL is required" });
      }

      const secret = `whsec_${crypto.randomBytes(16).toString("hex")}`;

      const webhook = await (prisma as any).webhookSubscription.create({
        data: {
          targetUrl,
          secret,
          eventsJson: JSON.stringify(events || ["*"]),
          tenantId: user.tenantId,
        },
      });

      res.status(201).json({ webhook });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create webhook subscription", details: error?.message });
    }
  }
);
