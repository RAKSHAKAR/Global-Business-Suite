import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { prisma } from "@saas/database";
import { auditLog } from "../../services/auditLogger";

export const orgHierarchyRouter = Router();

// GET /api/v1/admin/org/tree - Multi-level enterprise org structure
orgHierarchyRouter.get(
  "/tree",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const orgs = await (prisma as any).organization.findMany({
        include: {
          branches: {
            include: {
              departments: {
                include: {
                  teams: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ organizations: orgs });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch organization hierarchy" });
    }
  }
);

// POST /api/v1/admin/org/organizations - Create Organization
orgHierarchyRouter.post(
  "/organizations",
  authMiddleware,
  requirePermission("users", "manage"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { name, code, description, tenantId } = req.body;

      if (!name || !code) {
        return res.status(400).json({ error: "Organization Name and Code are required" });
      }

      const org = await (prisma as any).organization.create({
        data: { name, code: code.toUpperCase(), description, tenantId: tenantId || user.tenantId },
      });

      await auditLog(user.id || user.userId, user.tenantId, "ORGANIZATION_CREATED", "Organization", org.id, { name, code }, req);
      res.status(201).json({ organization: org });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create organization", details: error?.message });
    }
  }
);

// POST /api/v1/admin/org/branches - Create Branch
orgHierarchyRouter.post(
  "/branches",
  authMiddleware,
  requirePermission("users", "manage"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { organizationId, name, code, address } = req.body;

      if (!organizationId || !name || !code) {
        return res.status(400).json({ error: "OrganizationId, Name, and Code are required" });
      }

      const branch = await (prisma as any).branch.create({
        data: { organizationId, name, code: code.toUpperCase(), address },
      });

      await auditLog(user.id || user.userId, user.tenantId, "BRANCH_CREATED", "Branch", branch.id, { name, code }, req);
      res.status(201).json({ branch });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create branch", details: error?.message });
    }
  }
);

// POST /api/v1/admin/org/departments - Create Department
orgHierarchyRouter.post(
  "/departments",
  authMiddleware,
  requirePermission("users", "manage"),
  async (req: Request, res: Response) => {
    try {
      const { branchId, name } = req.body;
      if (!branchId || !name) {
        return res.status(400).json({ error: "BranchId and Department Name are required" });
      }

      const dept = await (prisma as any).department.create({
        data: { branchId, name },
      });

      res.status(201).json({ department: dept });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create department", details: error?.message });
    }
  }
);

// POST /api/v1/admin/org/teams - Create Team
orgHierarchyRouter.post(
  "/teams",
  authMiddleware,
  requirePermission("users", "manage"),
  async (req: Request, res: Response) => {
    try {
      const { departmentId, name, leaderId } = req.body;
      if (!departmentId || !name) {
        return res.status(400).json({ error: "DepartmentId and Team Name are required" });
      }

      const team = await (prisma as any).team.create({
        data: { departmentId, name, leaderId },
      });

      res.status(201).json({ team });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create team", details: error?.message });
    }
  }
);

// GET /api/v1/admin/org/user-groups - List User Groups
orgHierarchyRouter.get(
  "/user-groups",
  authMiddleware,
  async (_req: Request, res: Response) => {
    try {
      const groups = await (prisma as any).userGroup.findMany({
        orderBy: { name: "asc" },
      });
      res.json({ userGroups: groups });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch user groups" });
    }
  }
);

// POST /api/v1/admin/org/user-groups - Create User Group
orgHierarchyRouter.post(
  "/user-groups",
  authMiddleware,
  requirePermission("users", "manage"),
  async (req: Request, res: Response) => {
    try {
      const { name, description, userIds } = req.body;
      if (!name) {
        return res.status(400).json({ error: "User Group Name is required" });
      }

      const group = await (prisma as any).userGroup.create({
        data: {
          name,
          description,
          membersJson: JSON.stringify(userIds || []),
        },
      });

      res.status(201).json({ userGroup: group });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create user group", details: error?.message });
    }
  }
);

// POST /api/v1/admin/users/bulk-import - Bulk user import
orgHierarchyRouter.post(
  "/users/bulk-import",
  authMiddleware,
  requirePermission("users", "create"),
  async (req: Request, res: Response) => {
    try {
      const { users: userList } = req.body;
      if (!Array.isArray(userList) || userList.length === 0) {
        return res.status(400).json({ error: "User list array is required for bulk import" });
      }

      const createdUsers = [];
      for (const u of userList) {
        if (!u.email) continue;
        const created = await prisma.user.upsert({
          where: { email: u.email },
          update: { firstName: u.firstName, lastName: u.lastName, isActive: u.isActive ?? true },
          create: { email: u.email, firstName: u.firstName, lastName: u.lastName, isActive: u.isActive ?? true, tenantId: u.tenantId },
        });
        createdUsers.push(created);
      }

      res.status(201).json({ message: `Successfully processed ${createdUsers.length} users`, count: createdUsers.length });
    } catch (error: any) {
      res.status(500).json({ error: "Bulk import failed", details: error?.message });
    }
  }
);
