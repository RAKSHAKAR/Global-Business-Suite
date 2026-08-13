import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { sendSuccess, sendError } from "../../utils/responseHandler";

export const subscriptionAccessEngineRouter = Router();

export interface AccessEvaluationRequest {
  module: string;       // e.g. "reviews", "gbp", "analytics", "social", "ai", "crm", "exports"
  action: string;       // e.g. "view", "create", "edit", "delete", "approve", "export", "import", "share", "ai", "api"
  requestedUsage?: number;
}

/**
 * @route POST /api/v1/access/evaluate
 * @desc Evaluate granular View vs Action permissions and Subscription limits for user/tenant
 */
subscriptionAccessEngineRouter.post(
  "/access/evaluate",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { module, action } = req.body as AccessEvaluationRequest;

      if (!module || !action) {
        return sendError(res, "module and action are required", 400);
      }

      const tenantId = authUser?.tenantId;
      if (!tenantId) {
        // Platform Admins bypass tenant feature locks
        return sendSuccess(res, {
          allowed: true,
          locked: false,
          reason: "Platform Admin Access",
          allowedActions: ["view", "create", "edit", "delete", "approve", "export", "import", "share", "ai", "api"],
        });
      }

      // Fetch subscription & plan for tenant
      const activeSubscription = await prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { currentPeriodEnd: "desc" },
        include: { plan: true },
      });

      const isExpired = !activeSubscription || activeSubscription.status === "EXPIRED" || activeSubscription.status === "CANCELED";
      const isWriteAction = ["create", "edit", "delete", "approve", "export", "import", "share", "ai", "api"].includes(action.toLowerCase());
      const isAllowedInfoModule = ["billing", "plans", "invoices", "support", "info", "help", "profile", "notifications"].includes(module.toLowerCase());

      if (isExpired) {
        if (isWriteAction || !isAllowedInfoModule) {
          return sendSuccess(res, {
            allowed: false,
            locked: true,
            upgradeRequired: true,
            subscriptionExpired: true,
            requiredModule: module,
            requiredAction: action,
            message: "Subscription is expired. Upgrade or renew subscription to unlock.",
          });
        }
      }

      if (!activeSubscription || !activeSubscription.plan) {
        return sendSuccess(res, {
          allowed: false,
          locked: true,
          upgradeRequired: true,
          requiredModule: module,
          requiredAction: action,
          message: "No active subscription plan found. Upgrade required.",
        });
      }

      const plan = activeSubscription.plan;
      let allowedActionsMap: Record<string, string[]> = {};
      try {
        if ((plan as any).allowedActionsJson) {
          allowedActionsMap = JSON.parse((plan as any).allowedActionsJson);
        }
      } catch (e) {
        allowedActionsMap = {};
      }

      // Check if module permission exists
      const moduleActions = allowedActionsMap[module.toLowerCase()] || [];
      const isActionAllowed =
        plan.name === "Enterprise" ||
        (action.toLowerCase() === "view" && isAllowedInfoModule) ||
        moduleActions.includes("*") ||
        moduleActions.includes(action.toLowerCase());

      if (!isActionAllowed) {
        return sendSuccess(res, {
          allowed: false,
          locked: true,
          upgradeRequired: true,
          currentPlan: plan.name,
          requiredModule: module,
          requiredAction: action,
          message: `Your ${plan.name} plan does not include permission to '${action}' in '${module}'. Please upgrade your plan.`,
        });
      }

      return sendSuccess(res, {
        allowed: true,
        locked: false,
        currentPlan: plan.name,
        module,
        action,
        allowedActions: moduleActions,
      });
    } catch (error) {
      console.error("[subscriptionAccessEngine:evaluate]", error);
      return sendError(res, "Failed to evaluate feature access", 500);
    }
  }
);

/**
 * @route GET /api/v1/access/my-subscription-limits
 * @desc Retrieve active subscription limits and usage counters for current user/tenant
 */
subscriptionAccessEngineRouter.get(
  "/access/my-subscription-limits",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const tenantId = authUser?.tenantId;

      if (!tenantId) {
        return sendSuccess(res, { isUnlimitedAdmin: true });
      }

      const subscription = await prisma.subscription.findFirst({
        where: { tenantId, status: "ACTIVE" },
        include: { plan: true },
      });

      if (!subscription || !subscription.plan) {
        return sendError(res, "Active subscription required", 403);
      }

      const plan = subscription.plan as any;
      const limits = {
        maxCustomers: plan.maxCustomers,
        maxEmployees: plan.maxEmployees,
        maxOrganizations: plan.maxOrganizations,
        maxGoogleAccounts: plan.maxGoogleAccounts,
        maxGoogleBusinessProfiles: plan.maxGoogleBusinessProfiles,
        maxLocations: plan.maxLocations,
        maxSocialAccounts: plan.maxSocialAccounts,
        maxAiUsage: plan.maxAiUsage,
        maxStorageMb: plan.maxStorageMb,
        maxWhatsAppMessages: plan.maxWhatsAppMessages,
        maxSms: plan.maxSms,
        maxEmails: plan.maxEmails,
        maxCampaigns: plan.maxCampaigns,
        maxPosts: plan.maxPosts,
        maxReviewReplies: plan.maxReviewReplies,
        maxCalls: plan.maxCalls,
        maxAppointments: plan.maxAppointments,
        maxInboxConversations: plan.maxInboxConversations,
      };

      return sendSuccess(res, {
        planName: plan.name,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        limits,
      });
    } catch (error) {
      console.error("[subscriptionAccessEngine:myLimits]", error);
      return sendError(res, "Failed to fetch subscription limits", 500);
    }
  }
);
