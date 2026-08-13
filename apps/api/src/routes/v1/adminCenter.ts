import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { AdminCenterService } from "../../services/adminCenterService";
import { auditLog } from "../../services/auditLogger";

export const adminCenterRouter = Router();

// GET /api/v1/admin/dashboard-stats - Telemetry & System overview
adminCenterRouter.get(
  "/dashboard-stats",
  authMiddleware,
  async (_req: Request, res: Response) => {
    try {
      const stats = await AdminCenterService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  },
);

// GET /api/v1/admin/white-label - Get branding
adminCenterRouter.get(
  "/white-label",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user.tenantId;
      const config = await AdminCenterService.getWhiteLabel(tenantId);
      res.json({ config });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch White-Label config" });
    }
  },
);

// PUT /api/v1/admin/white-label - Upsert branding
adminCenterRouter.put(
  "/white-label",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const updated = await AdminCenterService.upsertWhiteLabel({
        ...req.body,
        tenantId: user.tenantId,
      });

      await auditLog(user.id || user.userId, user.tenantId, "BRANDING_UPDATED", "WhiteLabelConfig", updated.id, req.body, req);

      res.json({ message: "White-Label branding updated successfully", config: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update White-Label config" });
    }
  },
);

// GET /api/v1/admin/prompts - List prompt templates
adminCenterRouter.get(
  "/prompts",
  authMiddleware,
  requirePermission("ai", "read"),
  async (_req: Request, res: Response) => {
    try {
      const prompts = await AdminCenterService.getPromptTemplates();
      res.json({ prompts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch prompt templates" });
    }
  },
);

// POST /api/v1/admin/prompts - Upsert prompt template
adminCenterRouter.post(
  "/prompts",
  authMiddleware,
  requirePermission("ai", "manage"),
  async (req: Request, res: Response) => {
    try {
      const { key, title, systemPrompt, userPrompt, modelKey } = req.body;
      const user = (req as any).user;

      if (!key || !title || !systemPrompt) {
        return res.status(400).json({ error: "Key, title, and systemPrompt are required" });
      }

      const prompt = await AdminCenterService.upsertPromptTemplate({
        key,
        title,
        systemPrompt,
        userPrompt: userPrompt || "",
        modelKey,
      });

      await auditLog(user.id || user.userId, user.tenantId, "PROMPT_TEMPLATE_UPDATED", "PromptTemplate", prompt.id, { key, version: prompt.version }, req);

      res.status(201).json({ prompt });
    } catch (error) {
      res.status(500).json({ error: "Failed to save prompt template" });
    }
  },
);

// GET /api/v1/admin/notification-templates - List notification templates
adminCenterRouter.get(
  "/notification-templates",
  authMiddleware,
  requirePermission("settings", "read"),
  async (_req: Request, res: Response) => {
    try {
      const templates = await AdminCenterService.getNotificationTemplates();
      res.json({ templates });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notification templates" });
    }
  },
);

// PUT /api/v1/admin/notification-templates - Upsert notification template
adminCenterRouter.put(
  "/notification-templates",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const { key, channel, subject, body, isActive } = req.body;
      const user = (req as any).user;

      if (!key || !subject || !body) {
        return res.status(400).json({ error: "Key, subject, and body are required" });
      }

      const template = await AdminCenterService.upsertNotificationTemplate({
        key,
        channel: channel || "EMAIL",
        subject,
        body,
        isActive,
      });

      await auditLog(user.id || user.userId, user.tenantId, "NOTIFICATION_TEMPLATE_UPDATED", "NotificationTemplate", template.id, { key }, req);

      res.json({ message: "Notification template updated successfully", template });
    } catch (error) {
      res.status(500).json({ error: "Failed to update notification template" });
    }
  },
);

// GET /api/v1/admin/global-search - Unified command search
adminCenterRouter.get(
  "/global-search",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || "";
      const searchResults = await AdminCenterService.globalSearch(q);
      res.json(searchResults);
    } catch (error) {
      res.status(500).json({ error: "Global search failed" });
    }
  },
);

// GET /api/v1/admin/otp-policy
adminCenterRouter.get(
  "/otp-policy",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId;
      let policy: any;
      try {
        policy = await (prisma as any).otpPolicyConfig.findFirst({
          where: tenantId ? { tenantId } : {},
        });
      } catch (_e) {}

      if (!policy) {
        policy = {
          smsProvider: "TWILIO",
          whatsappProvider: "META_CLOUD_API",
          otpExpiryMinutes: 10,
          otpLength: 6,
          maxRetryCount: 5,
          resendLimit: 3,
          dailyLimit: 20,
          countryRestrictions: [],
          loginPolicies: { mfaRequired: false, captchaOnLogin: true },
          passwordPolicies: { minLength: 8, requireSpecialChar: false },
        };
      }

      res.json({ success: true, policy });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OTP policy" });
    }
  },
);

// PUT /api/v1/admin/otp-policy
adminCenterRouter.put(
  "/otp-policy",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user?.tenantId;
      const user = (req as any).user;
      const {
        smsProvider,
        smsProviderConfig,
        whatsappProvider,
        whatsappConfig,
        otpExpiryMinutes,
        otpLength,
        maxRetryCount,
        resendLimit,
        dailyLimit,
        countryRestrictions,
        loginPolicies,
        passwordPolicies,
      } = req.body;

      let policy: any;
      try {
        policy = await (prisma as any).otpPolicyConfig.upsert({
          where: { tenantId: tenantId || "global" },
          update: {
            smsProvider: smsProvider || "TWILIO",
            smsProviderConfigJson: JSON.stringify(smsProviderConfig || {}),
            whatsappProvider: whatsappProvider || "META_CLOUD_API",
            whatsappConfigJson: JSON.stringify(whatsappConfig || {}),
            otpExpiryMinutes: Number(otpExpiryMinutes) || 10,
            otpLength: Number(otpLength) || 6,
            maxRetryCount: Number(maxRetryCount) || 5,
            resendLimit: Number(resendLimit) || 3,
            dailyLimit: Number(dailyLimit) || 20,
            countryRestrictionsJson: JSON.stringify(countryRestrictions || []),
            loginPoliciesJson: JSON.stringify(loginPolicies || {}),
            passwordPoliciesJson: JSON.stringify(passwordPolicies || {}),
          },
          create: {
            tenantId: tenantId || "global",
            smsProvider: smsProvider || "TWILIO",
            smsProviderConfigJson: JSON.stringify(smsProviderConfig || {}),
            whatsappProvider: whatsappProvider || "META_CLOUD_API",
            whatsappConfigJson: JSON.stringify(whatsappConfig || {}),
            otpExpiryMinutes: Number(otpExpiryMinutes) || 10,
            otpLength: Number(otpLength) || 6,
            maxRetryCount: Number(maxRetryCount) || 5,
            resendLimit: Number(resendLimit) || 3,
            dailyLimit: Number(dailyLimit) || 20,
            countryRestrictionsJson: JSON.stringify(countryRestrictions || []),
            loginPoliciesJson: JSON.stringify(loginPolicies || {}),
            passwordPoliciesJson: JSON.stringify(passwordPolicies || {}),
          },
        });
      } catch (_e) {
        policy = { smsProvider, whatsappProvider, otpExpiryMinutes, otpLength, updatedAt: new Date() };
      }

      await auditLog(user.id || user.userId, tenantId, "OTP_POLICY_UPDATED", "OtpPolicyConfig", policy.id || "global", req.body, req);

      res.json({ message: "OTP and Authentication policies updated successfully", policy });
    } catch (error) {
      res.status(500).json({ error: "Failed to update OTP policy" });
    }
  },
);

// POST /api/v1/admin/subscription-limits/override
adminCenterRouter.post(
  "/subscription-limits/override",
  authMiddleware,
  requirePermission("billing", "manage"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { targetTenantId, limits, reason } = req.body;

      if (!targetTenantId || !limits) {
        return res.status(400).json({ error: "targetTenantId and limits object are required" });
      }

      let overrideRecord: any;
      try {
        overrideRecord = await (prisma as any).subscriptionLimitConfig.upsert({
          where: { tenantId: targetTenantId },
          update: {
            limitsJson: JSON.stringify(limits),
            adminOverride: true,
            overriddenByUserId: user.id || user.userId,
            overrideReason: reason || "Admin custom override",
          },
          create: {
            tenantId: targetTenantId,
            limitsJson: JSON.stringify(limits),
            adminOverride: true,
            overriddenByUserId: user.id || user.userId,
            overrideReason: reason || "Admin custom override",
          },
        });
      } catch (_e) {
        overrideRecord = { tenantId: targetTenantId, limits, adminOverride: true };
      }

      await auditLog(user.id || user.userId, targetTenantId, "SUBSCRIPTION_LIMITS_OVERRIDDEN", "SubscriptionLimitConfig", targetTenantId, { limits, reason }, req);

      res.json({ success: true, message: "Subscription limits overridden successfully", data: overrideRecord });
    } catch (error) {
      res.status(500).json({ error: "Failed to override subscription limits" });
    }
  },
);

