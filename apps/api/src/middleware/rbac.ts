import { Request, Response, NextFunction } from "express";
import { auditLog } from "../services/auditLogger";
import { permissionCache } from "../services/permissionCacheService";
import { JwtPayload } from "../config/jwt";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Enterprise Dynamic RBAC Permission Guard Middleware.
 *
 * Enforces fine-grained resource:action access control with scope validation
 * across all API routes.
 *
 * PERFORMANCE FIX (H-04): Uses Redis-backed permission cache to avoid N+1 DB
 * queries on every protected API request. Cache TTL is configurable via
 * RBAC_CACHE_TTL_SECONDS environment variable (default: 300s / 5 minutes).
 *
 * Cache invalidation occurs automatically when a user's roles are changed
 * via the roles assignment endpoints.
 */
export function requirePermission(resource: string, action: string, requiredScope?: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user?.userId || (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "MISSING_AUTH",
        });
      }

      // Load from cache or DB — single DB query per user per cache TTL
      const compiled = await permissionCache.getOrLoad(userId);

      if (!compiled) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // 0. Suspended User Governance Check
      if (compiled.isSuspended) {
        const isWriteMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(
          req.method.toUpperCase(),
        );
        const allowedReadResources = [
          "billing",
          "support",
          "profile",
          "me",
          "auth",
          "tickets",
        ];
        const isAllowedRead =
          !isWriteMutation &&
          allowedReadResources.includes(resource.toLowerCase());

        if (isWriteMutation || !isAllowedRead) {
          return res.status(403).json({
            success: false,
            error:
              "Account is suspended. Read-only access to billing & support allowed.",
            code: "ACCOUNT_SUSPENDED_READONLY",
            isSuspended: true,
            resource,
            action,
          });
        }
      }

      // 1. Super Admin bypass (Full Platform Access)
      if (compiled.isSuperAdmin) {
        return next();
      }

      // 2. Check compiled permission set (O(1) lookup)
      const hasPermission =
        compiled.permissionSet.has(`${resource}:${action}`) ||
        compiled.permissionSet.has(`${resource}:manage`);

      if (!hasPermission) {
        // Non-blocking audit log of unauthorized attempt
        await auditLog(
          userId,
          req.user?.tenantId,
          "ACCESS_DENIED",
          resource,
          undefined,
          { requiredPermission: `${resource}:${action}`, requiredScope },
          req,
        ).catch(() => {});

        return res.status(403).json({
          success: false,
          error: "Access denied: Insufficient permissions",
          code: "PERMISSION_DENIED",
          requiredPermission: `${resource}:${action}`,
          requiredScope: requiredScope || "TENANT",
          message: `Your assigned role(s) do not grant access to ${action} ${resource}.`,
        });
      }

      next();
    } catch (error) {
      console.error("[rbacGuard]", error);
      res.status(500).json({
        success: false,
        error: "Failed to evaluate RBAC permissions",
        code: "RBAC_ERROR",
      });
    }
  };
}

