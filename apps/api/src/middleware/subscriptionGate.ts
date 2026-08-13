import { Request, Response, NextFunction } from "express";
import { prisma } from "@saas/database";

export interface GatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    tenantId?: string;
  };
  subscriptionPlan?: {
    id: string;
    name: string;
    allowedModels: string[];
  };
}

/**
 * Enterprise Middleware to enforce Subscription Plan Feature Gating.
 * Checks if the tenant's current active subscription includes the requested feature or AI model.
 */
export function requirePlanFeature(featureKey: string) {
  return async (req: GatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        // Platform Admins without tenant context bypass feature gating
        return next();
      }

      // 1. Fetch active subscription & plan for tenant
      const subscription = await prisma.subscription.findFirst({
        where: {
          tenantId,
          status: "ACTIVE",
        },
        include: {
          plan: true,
        },
      });

      if (!subscription || !subscription.plan) {
        return res.status(403).json({
          error: "Active subscription plan required",
          upgradeRequired: true,
          message:
            "Your tenant does not have an active subscription. Please upgrade your plan to access this feature.",
          requiredFeature: featureKey,
        });
      }

      const plan = subscription.plan;
      let allowedModels: string[] = [];

      try {
        if (plan.allowedModels) {
          allowedModels = JSON.parse(plan.allowedModels);
        }
      } catch (e) {
        allowedModels = [];
      }

      // SECURITY FIX (H-07): Use plan code/tier for tier detection,
      // not brittle string name comparison. Falls back to name check
      // for backward compatibility with existing plan records.
      const planCode = (plan as any).code?.toUpperCase() || "";
      const isEnterpriseTier =
        planCode === "ENTERPRISE" ||
        plan.name?.toLowerCase() === "enterprise" ||
        allowedModels.includes("*");

      const isAllowed = isEnterpriseTier || allowedModels.includes(featureKey);

      if (!isAllowed) {
        return res.status(403).json({
          error: "Feature locked under current subscription plan",
          upgradeRequired: true,
          currentPlan: plan.name,
          requiredFeature: featureKey,
          message: `The feature '${featureKey}' is not included in your ${plan.name} plan. Please upgrade to unlock.`,
        });
      }

      // Attach plan info to request for downstream handlers
      req.subscriptionPlan = {
        id: plan.id,
        name: plan.name,
        allowedModels,
      };

      next();
    } catch (error) {
      console.error("[subscriptionGate]", error);
      res
        .status(500)
        .json({ error: "Failed to verify subscription feature access" });
    }
  };
}

/**
 * Enterprise Middleware to enforce granular View vs Action permissions per module.
 */
export function requireActionPermission(module: string, action: string) {
  return async (req: GatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return next();
      }

      const subscription = await prisma.subscription.findFirst({
        where: { tenantId },
        orderBy: { currentPeriodEnd: "desc" },
        include: { plan: true },
      });

      const isExpired = !subscription || subscription.status === "EXPIRED" || subscription.status === "CANCELED";
      const isWriteMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase()) || ["create", "edit", "delete", "publish"].includes(action.toLowerCase());
      const isAllowedReadModule = ["billing", "plans", "invoices", "support", "info", "notifications", "me", "profile"].includes(module.toLowerCase());

      if (isExpired) {
        if (isWriteMutation || !isAllowedReadModule) {
          return res.status(403).json({
            error: "Subscription expired. Renewal required to perform write actions or access premium modules.",
            upgradeRequired: true,
            subscriptionExpired: true,
            requiredModule: module,
            requiredAction: action,
          });
        }
      }

      if (!subscription || !subscription.plan) {
        return res.status(403).json({
          error: "Active subscription plan required",
          upgradeRequired: true,
          requiredModule: module,
          requiredAction: action,
        });
      }

      const plan = subscription.plan as any;
      let allowedActionsMap: Record<string, string[]> = {};
      try {
        if (plan.allowedActionsJson) {
          allowedActionsMap = JSON.parse(plan.allowedActionsJson);
        }
      } catch (e) {
        allowedActionsMap = {};
      }

      const moduleActions = allowedActionsMap[module.toLowerCase()] || [];
      const planCodeStr = (plan as any).code?.toUpperCase() || "";
      const isEnterprisePlan =
        planCodeStr === "ENTERPRISE" ||
        plan.name?.toLowerCase() === "enterprise" ||
        moduleActions.includes("*");

      const isAllowed = isEnterprisePlan || moduleActions.includes(action.toLowerCase());

      if (!isAllowed) {
        return res.status(403).json({
          error: "Action restricted under current plan",
          upgradeRequired: true,
          currentPlan: plan.name,
          requiredModule: module,
          requiredAction: action,
          message: `Your ${plan.name} plan does not permit ${action} on ${module}. Upgrade to unlock.`,
        });
      }

      next();
    } catch (error) {
      console.error("[requireActionPermission]", error);
      res.status(500).json({ error: "Failed to verify action permission" });
    }
  };
}
