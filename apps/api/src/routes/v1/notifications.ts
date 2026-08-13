import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { notificationsServiceModule } from "../../services/microservices/notificationsServiceModule";
import { sendSuccess, sendError } from "../../utils/responseHandler";
import { validateRequest, requireFields } from "../../middleware/validation";

export const notificationsRouter = Router();

/**
 * @openapi
 * /notifications/send:
 *   post:
 *     summary: Dispatch notification across channels
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
notificationsRouter.post(
  "/send",
  authMiddleware,
  validateRequest({
    body: requireFields(["recipient", "channel", "title", "body"]),
  }),
  async (req: AuthRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return sendError(res, "Tenant ID required", 400, "TENANT_REQUIRED");
      }

      const { recipient, channel, title, body, metadata } = req.body;
      const result = await notificationsServiceModule.sendNotification({
        tenantId,
        userId: req.user?.id,
        recipient,
        channel,
        title,
        body,
        metadata,
      });

      return sendSuccess(res, result, 201);
    } catch (error: any) {
      return sendError(res, error.message || "Failed to dispatch notification", 500);
    }
  },
);

/**
 * @openapi
 * /notifications/preferences:
 *   get:
 *     summary: Fetch user notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
notificationsRouter.get("/preferences", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const preferences = await notificationsServiceModule.getNotificationPreferences(req.user?.id ?? "");
    return sendSuccess(res, preferences);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to fetch notification preferences", 500);
  }
});
