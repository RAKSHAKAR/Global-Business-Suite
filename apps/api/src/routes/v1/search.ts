import { Router, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { searchServiceModule } from "../../services/microservices/searchServiceModule";
import { sendSuccess, sendError } from "../../utils/responseHandler";

export const searchRouter = Router();

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Global multi-entity search
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, users, leads, reviews, posts]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results returned successfully
 */
searchRouter.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId || (await prisma.tenant.findFirst())?.id;
    if (!tenantId) {
      return sendError(res, "Tenant ID missing from context", 400, "TENANT_REQUIRED");
    }

    const query = req.query.q as string;
    if (!query) {
      return sendError(res, "Query parameter 'q' is required", 400, "INVALID_QUERY");
    }

    const type = req.query.type as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

    const result = await searchServiceModule.globalSearch({
      tenantId,
      query,
      type,
      limit,
      page,
    });

    return sendSuccess(res, result.results, 200, {
      pagination: result.pagination,
      query: result.query,
    });
  } catch (error: any) {
    return sendError(res, error.message || "Global search failed", 500);
  }
});
