import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";

const router = Router();

// GET /api/v1/roles - List all roles
router.get(
  "/",
  authMiddleware,
  requirePermission("roles", "read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user.tenantId;
      const roles = await prisma.role.findMany({
        where: tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {},
        include: {
          permissions: {
            include: { permission: true },
          },
          _count: { select: { users: true } },
        },
        orderBy: { createdAt: "asc" },
      });
      res.json({ data: roles });
    } catch (error) {
      console.error("[roles:list]", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  },
);

// GET /api/v1/permissions - List all permissions
router.get(
  "/permissions",
  authMiddleware,
  requirePermission("roles", "read"),
  async (_req: Request, res: Response) => {
    try {
      const permissions = await prisma.permission.findMany({
        orderBy: [{ resource: "asc" }, { action: "asc" }],
      });
      res.json({ data: permissions });
    } catch (error) {
      console.error("[permissions:list]", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  },
);

// POST /api/v1/roles - Create custom role
router.post(
  "/",
  authMiddleware,
  requirePermission("roles", "create"),
  async (req: Request, res: Response) => {
    try {
      const { name, description, permissionIds } = req.body;
      const tenantId = (req as any).user.tenantId;

      if (!name)
        return res.status(400).json({ error: "Role name is required" });

      const role = await prisma.role.create({
        data: {
          name,
          description,
          tenantId: tenantId || null,
          isSystem: false,
          permissions:
            permissionIds && Array.isArray(permissionIds)
              ? {
                  create: permissionIds.map((pId: string) => ({
                    permissionId: pId,
                  })),
                }
              : undefined,
        },
        include: {
          permissions: { include: { permission: true } },
        },
      });

      res.status(201).json({ role });
    } catch (error) {
      console.error("[roles:create]", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  },
);

// PUT /api/v1/roles/:id - Update role permissions
router.put(
  "/:id",
  authMiddleware,
  requirePermission("roles", "update"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, permissionIds } = req.body;

      const existingRole = await prisma.role.findUnique({ where: { id } });
      if (!existingRole)
        return res.status(404).json({ error: "Role not found" });
      if (existingRole.isSystem)
        return res
          .status(403)
          .json({ error: "System roles cannot be modified" });

      // Update permissions via transaction
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });

      const updatedRole = await prisma.role.update({
        where: { id },
        data: {
          name: name || existingRole.name,
          description: description ?? existingRole.description,
          permissions:
            permissionIds && Array.isArray(permissionIds)
              ? {
                  create: permissionIds.map((pId: string) => ({
                    permissionId: pId,
                  })),
                }
              : undefined,
        },
        include: {
          permissions: { include: { permission: true } },
        },
      });

      res.json({ role: updatedRole });
    } catch (error) {
      console.error("[roles:update]", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  },
);

// DELETE /api/v1/roles/:id - Delete custom role
router.delete(
  "/:id",
  authMiddleware,
  requirePermission("roles", "delete"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existingRole = await prisma.role.findUnique({ where: { id } });

      if (!existingRole)
        return res.status(404).json({ error: "Role not found" });
      if (existingRole.isSystem)
        return res
          .status(403)
          .json({ error: "System roles cannot be deleted" });

      await prisma.role.delete({ where: { id } });
      res.json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
      console.error("[roles:delete]", error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  },
);

export default router;
