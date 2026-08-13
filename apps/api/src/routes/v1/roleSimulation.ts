import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { prisma } from "@saas/database";
import { auditLog } from "../../services/auditLogger";

export const roleSimulationRouter = Router();

// POST /api/v1/admin/roles/clone - Clone existing role with permissions
roleSimulationRouter.post(
  "/clone",
  authMiddleware,
  requirePermission("roles", "manage"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { sourceRoleId, newRoleName, newDescription } = req.body;

      if (!sourceRoleId || !newRoleName) {
        return res.status(400).json({ error: "sourceRoleId and newRoleName are required" });
      }

      const sourceRole = await prisma.role.findUnique({
        where: { id: sourceRoleId },
        include: { permissions: true },
      });

      if (!sourceRole) {
        return res.status(404).json({ error: "Source role not found" });
      }

      const clonedRole = await prisma.role.create({
        data: {
          name: newRoleName,
          description: newDescription || `Cloned from ${sourceRole.name}`,
          isSystem: false,
          tenantId: sourceRole.tenantId,
        },
      });

      if (sourceRole.permissions.length > 0) {
        await prisma.rolePermission.createMany({
          data: sourceRole.permissions.map((p) => ({
            roleId: clonedRole.id,
            permissionId: p.permissionId,
          })),
        });
      }

      await auditLog(user.id || user.userId, user.tenantId, "ROLE_CLONED", "Role", clonedRole.id, { sourceRoleId, newRoleName }, req);
      res.status(201).json({ role: clonedRole });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to clone role", details: error?.message });
    }
  }
);

// POST /api/v1/admin/roles/simulate - Permission Simulation Engine
roleSimulationRouter.post(
  "/simulate",
  authMiddleware,
  requirePermission("roles", "read"),
  async (req: Request, res: Response) => {
    try {
      const { targetUserId, resource, action } = req.body;

      if (!targetUserId || !resource || !action) {
        return res.status(400).json({ error: "targetUserId, resource, and action are required" });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!targetUser) {
        return res.status(404).json({ error: "Target user not found" });
      }

      const assignedRoles = targetUser.roles.map((ur) => ur.role.name);
      let isAllowed = false;
      let matchingPermission = null;

      for (const ur of targetUser.roles) {
        if (ur.role.name === "Super Admin") {
          isAllowed = true;
          matchingPermission = { resource: "*", action: "*", role: "Super Admin" };
          break;
        }
        for (const rp of ur.role.permissions) {
          if (
            (rp.permission.resource === resource || rp.permission.resource === "*") &&
            (rp.permission.action === action || rp.permission.action === "manage" || rp.permission.action === "*")
          ) {
            isAllowed = true;
            matchingPermission = rp.permission;
            break;
          }
        }
        if (isAllowed) break;
      }

      res.json({
        simulation: {
          targetUser: { id: targetUser.id, email: targetUser.email },
          resource,
          action,
          isAllowed,
          matchingPermission,
          assignedRoles,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: "Permission simulation failed", details: error?.message });
    }
  }
);
