import { NextFunction, Request, Response } from "express";
import { prisma } from "@saas/database";
import { AuthRequest } from "./auth";

export type PortalKind = "PARTNER" | "CUSTOMER";

const PORTAL_ROLE_NAMES: Record<PortalKind, ReadonlySet<string>> = {
  PARTNER: new Set([
    "partner",
    "partneradmin",
    "partnermanager",
    "partnermember",
  ]),
  CUSTOMER: new Set([
    "customer",
    "customeradmin",
    "customeruser",
    "customermember",
  ]),
};

const SUPER_ADMIN_ROLE_NAMES = new Set([
  "superadmin",
  "superadministrator",
  "platformadmin",
]);

/** Normalize legacy role spellings such as PARTNER_ADMIN and Partner Admin. */
export function normalizeRoleName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Enforce portal identity from authoritative database roles.
 *
 * JWT role/tenant claims are deliberately ignored for authorization. The
 * account's current tenant and roles are loaded on every portal request, and
 * the request context is replaced with those authoritative values.
 */
export function requirePortalAccess(portal: PortalKind) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tokenUser = (req as AuthRequest).user;
    const userId = tokenUser?.userId || tokenUser?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "MISSING_AUTH",
      });
    }

    try {
      const account = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          tenantId: true,
          isActive: true,
          isDeleted: true,
          isSuspended: true,
          approvalStatus: true,
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                  isSystem: true,
                  tenantId: true,
                },
              },
            },
          },
        },
      });

      if (!account) {
        return res.status(401).json({
          success: false,
          error: "Authenticated account no longer exists",
          code: "ACCOUNT_NOT_FOUND",
        });
      }

      if (
        !account.isActive ||
        account.isDeleted ||
        account.isSuspended ||
        account.approvalStatus !== "APPROVED"
      ) {
        return res.status(403).json({
          success: false,
          error: "Account is not permitted to access a portal",
          code: "ACCOUNT_ACCESS_RESTRICTED",
        });
      }

      const roleRecords = account.roles.map(({ role }) => ({
        ...role,
        normalizedName: normalizeRoleName(role.name),
      }));
      const isSuperAdmin = roleRecords.some(
        ({ normalizedName, isSystem, tenantId }) =>
          SUPER_ADMIN_ROLE_NAMES.has(normalizedName) &&
          isSystem === true &&
          tenantId === null,
      );

      // Cross-portal administration is disabled by default. It can only be
      // enabled as an explicit deployment policy, never via a JWT claim.
      const superAdminPortalAccess =
        isSuperAdmin && process.env.ALLOW_SUPER_ADMIN_PORTAL_ACCESS === "true";

      const hasPortalRole = roleRecords.some(
        ({ normalizedName, tenantId }) =>
          PORTAL_ROLE_NAMES[portal].has(normalizedName) &&
          Boolean(account.tenantId) &&
          tenantId === account.tenantId,
      );

      if (!hasPortalRole && !superAdminPortalAccess) {
        return res.status(403).json({
          success: false,
          error: `This account is not authorized for the ${portal.toLowerCase()} portal`,
          code: "PORTAL_ROLE_DENIED",
          requiredPortal: portal,
        });
      }

      if (!account.tenantId) {
        return res.status(403).json({
          success: false,
          error: "Portal access requires an assigned tenant",
          code: "PORTAL_TENANT_REQUIRED",
        });
      }

      (req as AuthRequest).user = {
        ...tokenUser,
        userId: account.id,
        id: account.id,
        email: account.email,
        tenantId: account.tenantId,
        approvalStatus: account.approvalStatus,
        isSuspended: account.isSuspended,
        roles: account.roles.map(({ role }) => ({ role })),
      };

      return next();
    } catch (error) {
      console.error(`[portalAccess:${portal}]`, error);
      return res.status(500).json({
        success: false,
        error: "Failed to validate portal access",
        code: "PORTAL_ACCESS_ERROR",
      });
    }
  };
}
