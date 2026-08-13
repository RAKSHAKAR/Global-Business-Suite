import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { auditLog } from "../../services/auditLogger";
import { sendSuccess, sendPaginated, sendError } from "../../utils/responseHandler";

export const tenantsRouter = Router();

tenantsRouter.use(authMiddleware);

/**
 * @swagger
 * /api/v1/tenants:
 *   get:
 *     summary: List tenants with pagination
 *     tags: [Tenants]
 */
tenantsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(100, parseInt(String(req.query.limit || "20")));
    const search = String(req.query.search || "");

    const where = search ? { name: { contains: search } } : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.tenant.count({ where }),
    ]);

    return sendPaginated(res, tenants, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[tenantsRouter:list]", error);
    return sendError(res, "Failed to fetch tenants", 500, "TENANT_FETCH_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/tenants:
 *   post:
 *     summary: Create new tenant
 *     tags: [Tenants]
 */
tenantsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, domain, subdomain, logoUrl, primaryColor } = req.body;
    if (!name) return sendError(res, "Name is required", 400, "VALIDATION_ERROR");

    const tenant = await prisma.tenant.create({
      data: {
        name,
        domain:
          domain || `${name.toLowerCase().replace(/\s+/g, "")}.platform.local`,
        subdomain,
        logoUrl,
        primaryColor,
      },
    });

    await auditLog(
      (req as any).user?.userId,
      null,
      "TENANT_CREATED",
      "Tenant",
      tenant.id,
      { name },
      req,
    );

    return res.status(201).json({
      success: true,
      data: tenant,
      ...tenant,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error("[tenantsRouter:create]", error);
    return sendError(res, "Failed to create tenant", 500, "TENANT_CREATE_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/tenants/{id}:
 *   put:
 *     summary: Update tenant settings
 *     tags: [Tenants]
 */
tenantsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const {
      name,
      domain,
      isActive,
      logoUrl,
      primaryColor,
      themeSettingsJson,
      featuresJson,
    } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        name,
        domain,
        isActive,
        logoUrl,
        primaryColor,
        themeSettingsJson,
        featuresJson,
      },
    });

    return sendSuccess(res, tenant);
  } catch (error) {
    console.error("[tenantsRouter:update]", error);
    return sendError(res, "Failed to update tenant", 500, "TENANT_UPDATE_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/tenants/{id}:
 *   delete:
 *     summary: Soft deactivate tenant
 *     tags: [Tenants]
 */
tenantsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return sendSuccess(res, { message: "Tenant deactivated", tenant });
  } catch (error) {
    console.error("[tenantsRouter:delete]", error);
    return sendError(res, "Failed to deactivate tenant", 500, "TENANT_DELETE_ERROR");
  }
});
