import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { sendSuccess, sendError } from "../../utils/responseHandler";

export const settingsRouter = Router();

settingsRouter.use(authMiddleware);

/**
 * @swagger
 * /api/v1/settings:
 *   get:
 *     summary: Fetch platform settings
 *     tags: [Settings]
 */
settingsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.platformSetting.findMany();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    return sendSuccess(res, settingsObj);
  } catch (error) {
    console.error("[settingsRouter:get]", error);
    return sendError(res, "Failed to fetch settings", 500, "SETTINGS_FETCH_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/settings:
 *   put:
 *     summary: Update platform settings key-value pairs
 *     tags: [Settings]
 */
settingsRouter.put("/", async (req: Request, res: Response) => {
  try {
    const settingsObj = req.body;
    if (!settingsObj || typeof settingsObj !== "object") {
      return sendError(res, "Invalid settings object payload", 400, "VALIDATION_ERROR");
    }

    const promises = Object.keys(settingsObj).map((key) =>
      prisma.platformSetting.upsert({
        where: { key },
        update: { value: String(settingsObj[key]) },
        create: { key, value: String(settingsObj[key]) },
      }),
    );
    await Promise.all(promises);

    return sendSuccess(res, { message: "Settings updated successfully" });
  } catch (error) {
    console.error("[settingsRouter:update]", error);
    return sendError(res, "Failed to update settings", 500, "SETTINGS_UPDATE_ERROR");
  }
});
