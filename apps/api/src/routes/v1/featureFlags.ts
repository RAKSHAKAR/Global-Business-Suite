import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { FeatureFlagService } from "../../services/featureFlagService";
import { auditLog } from "../../services/auditLogger";

export const featureFlagsRouter = Router();

// GET /api/v1/feature-flags - List feature flags
featureFlagsRouter.get(
  "/",
  authMiddleware,
  async (_req: Request, res: Response) => {
    try {
      const flags = await FeatureFlagService.getFlags();
      res.json({ flags });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch feature flags" });
    }
  },
);

// POST /api/v1/feature-flags/evaluate - Evaluate a flag for current user context
featureFlagsRouter.post(
  "/evaluate",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { flagKey } = req.body;
      const user = (req as any).user;
      if (!flagKey) return res.status(400).json({ error: "flagKey is required" });

      const enabled = await FeatureFlagService.isEnabled(flagKey, {
        tenantId: user.tenantId,
        userId: user.id || user.userId,
      });

      res.json({ flagKey, enabled });
    } catch (error) {
      res.status(500).json({ error: "Failed to evaluate feature flag" });
    }
  },
);

// PUT /api/v1/feature-flags - Upsert feature flag definition (Admin only)
featureFlagsRouter.put(
  "/",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const { key, name, description, isEnabled, targetRules } = req.body;
      const user = (req as any).user;

      if (!key || !name) {
        return res.status(400).json({ error: "Key and name are required" });
      }

      const flag = await FeatureFlagService.upsertFlag({
        key,
        name,
        description,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        targetRules,
      });

      await auditLog(user.id || user.userId, user.tenantId, "FEATURE_FLAG_UPDATED", "FeatureFlag", flag.id, { key, isEnabled }, req);

      res.json({ message: "Feature flag updated successfully", flag });
    } catch (error) {
      res.status(500).json({ error: "Failed to update feature flag" });
    }
  },
);
