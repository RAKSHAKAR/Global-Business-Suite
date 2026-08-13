import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { sendSuccess, sendPaginated, sendError } from "../../utils/responseHandler";

export const clientsRouter = Router();

clientsRouter.use(authMiddleware);
clientsRouter.use(requirePermission("clients", "manage"));

function getAuthenticatedTenantId(req: Request): string | null {
  const tenantId = (req as any).user?.tenantId;
  return typeof tenantId === "string" && tenantId.trim() ? tenantId : null;
}

/**
 * @swagger
 * /api/v1/clients:
 *   get:
 *     summary: List clients for tenant
 *     tags: [Clients]
 */
clientsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = getAuthenticatedTenantId(req);
    if (!tenantId) {
      return sendError(res, "An authenticated tenant context is required", 403, "TENANT_CONTEXT_REQUIRED");
    }

    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(100, parseInt(String(req.query.limit || "20")));
    const search = String(req.query.search || "");

    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.client.count({ where }),
    ]);

    return sendPaginated(res, clients, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[clientsRouter:list]", error);
    return sendError(res, "Failed to fetch clients", 500, "CLIENT_FETCH_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/clients:
 *   post:
 *     summary: Create new client under tenant
 *     tags: [Clients]
 */
clientsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = getAuthenticatedTenantId(req);
    const { firstName, lastName, email, phone } = req.body;

    if (!tenantId || !firstName || !lastName || !email) {
      return sendError(res, "Missing required fields (firstName, lastName, email) or tenant context", 400, "VALIDATION_ERROR");
    }

    const client = await prisma.client.create({
      data: { firstName, lastName, email, phone, tenantId },
    });

    return sendSuccess(res, client, 201);
  } catch (error) {
    console.error("[clientsRouter:create]", error);
    return sendError(res, "Failed to create client", 500, "CLIENT_CREATE_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/clients/{id}:
 *   put:
 *     summary: Update client details
 *     tags: [Clients]
 */
clientsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getAuthenticatedTenantId(req);
    if (!tenantId) {
      return sendError(res, "An authenticated tenant context is required", 403, "TENANT_CONTEXT_REQUIRED");
    }

    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true },
    });
    if (!existing) {
      return sendError(res, "Client not found", 404, "CLIENT_NOT_FOUND");
    }

    const { firstName, lastName, email, phone, status } = req.body;
    const client = await prisma.client.update({
      where: { id: existing.id },
      data: { firstName, lastName, email, phone, status },
    });

    return sendSuccess(res, client);
  } catch (error) {
    console.error("[clientsRouter:update]", error);
    return sendError(res, "Failed to update client", 500, "CLIENT_UPDATE_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/clients/{id}:
 *   delete:
 *     summary: Delete client record
 *     tags: [Clients]
 */
clientsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getAuthenticatedTenantId(req);
    if (!tenantId) {
      return sendError(res, "An authenticated tenant context is required", 403, "TENANT_CONTEXT_REQUIRED");
    }

    const existing = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId },
      select: { id: true },
    });
    if (!existing) {
      return sendError(res, "Client not found", 404, "CLIENT_NOT_FOUND");
    }

    await prisma.client.delete({ where: { id: existing.id } });
    return sendSuccess(res, { message: "Client deleted", clientId: existing.id });
  } catch (error) {
    console.error("[clientsRouter:delete]", error);
    return sendError(res, "Failed to delete client", 500, "CLIENT_DELETE_ERROR");
  }
});
