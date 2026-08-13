import { Request } from "express";
import { prisma } from "@saas/database";

/**
 * Centralized, non-blocking Audit Logger Service.
 * Replaces the inline `auditLog` function previously duplicated in index.ts.
 * All writes are fire-and-forget — they never block the response path.
 */
export const auditLog = async (
  userId: string | null | undefined,
  tenantId: string | null | undefined,
  action: string,
  resource: string,
  resourceId: string | null | undefined,
  details: object | null,
  req: Request,
): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || undefined,
        tenantId: tenantId || undefined,
        action,
        resource,
        resourceId: resourceId || undefined,
        details: details ? JSON.stringify(details) : undefined,
        ipAddress: req.ip || req.socket?.remoteAddress,
        userAgent: req.get("User-Agent"),
      },
    });
  } catch (_err) {
    // Non-blocking: audit log failures must never break the response path
  }
};
