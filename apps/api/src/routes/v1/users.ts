import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { sendSuccess, sendPaginated, sendError } from "../../utils/responseHandler";

export const usersRouter = Router();

usersRouter.use(authMiddleware);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List users with pagination
 *     tags: [Users]
 */
usersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(100, parseInt(String(req.query.limit || "20")));

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          tenantId: true,
          createdAt: true,
          tenant: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);

    return sendPaginated(res, users, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[usersRouter:list]", error);
    return sendError(res, "Failed to fetch users", 500, "USER_FETCH_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create user
 *     tags: [Users]
 */
usersRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, tenantId } = req.body;
    if (!email || !tenantId) {
      return sendError(res, "Email and tenantId are required", 400, "VALIDATION_ERROR");
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return sendError(res, "Tenant not found", 404, "NOT_FOUND");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return sendError(res, "Email already in use", 400, "DUPLICATE_EMAIL");

    const passwordHash = await bcrypt.hash("Welcome123!", 12);
    const user = await prisma.user.create({
      data: { email, firstName, lastName, tenantId, passwordHash },
    });

    const { passwordHash: _, ...safeUser } = user;
    return sendSuccess(res, safeUser, 201);
  } catch (error) {
    console.error("[usersRouter:create]", error);
    return sendError(res, "Failed to create user", 500, "USER_CREATE_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 */
usersRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, isActive, tenantId } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { email, firstName, lastName, isActive, tenantId },
    });
    const { passwordHash, ...safeUser } = user;
    return sendSuccess(res, safeUser);
  } catch (error) {
    console.error("[usersRouter:update]", error);
    return sendError(res, "Failed to update user", 500, "USER_UPDATE_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Soft delete user
 *     tags: [Users]
 */
usersRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return sendSuccess(res, { message: "User deactivated", userId: user.id });
  } catch (error) {
    console.error("[usersRouter:delete]", error);
    return sendError(res, "Failed to deactivate user", 500, "USER_DELETE_ERROR");
  }
});
