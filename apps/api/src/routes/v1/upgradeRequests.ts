import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { auditLog } from "../../services/auditLogger";
import { sendSuccess, sendError } from "../../utils/responseHandler";

export const upgradeRequestsRouter = Router();

/**
 * @route POST /api/v1/upgrades/request
 * @desc Customer or Partner submits subscription upgrade request
 */
upgradeRequestsRouter.post(
  "/upgrades/request",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { requestedPlanId, reason, requestedLimits } = req.body;

      if (!requestedPlanId) {
        return sendError(res, "requestedPlanId is required", 400);
      }

      const targetPlan = await prisma.plan.findUnique({ where: { id: requestedPlanId } });
      if (!targetPlan) {
        return sendError(res, "Target plan not found", 404);
      }

      const currentSub = user.tenantId
        ? await prisma.subscription.findFirst({
            where: { tenantId: user.tenantId, status: "ACTIVE" },
          })
        : null;

      const upgradeReq = await (prisma as any).upgradeRequest.create({
        data: {
          userId: user.userId,
          tenantId: user.tenantId || null,
          currentPlanId: currentSub?.planId || null,
          requestedPlanId,
          requestedLimitsJson: requestedLimits ? JSON.stringify(requestedLimits) : "{}",
          reason: reason || "Subscription upgrade request",
          status: "PENDING",
        },
      });

      await auditLog(
        user.userId,
        user.tenantId,
        "UPGRADE_REQUEST_SUBMITTED",
        "UpgradeRequest",
        upgradeReq.id,
        { requestedPlanId, targetPlanName: targetPlan.name },
        req
      );

      return sendSuccess(res, upgradeReq, 200, { message: "Upgrade request submitted successfully" });
    } catch (error) {
      console.error("[upgradeRequests:create]", error);
      return sendError(res, "Failed to submit upgrade request", 500);
    }
  }
);

/**
 * @route GET /api/v1/upgrades/my-requests
 * @desc Fetch current user/tenant upgrade requests
 */
upgradeRequestsRouter.get(
  "/upgrades/my-requests",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      const requests = await (prisma as any).upgradeRequest.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: "desc" },
      });

      return sendSuccess(res, requests, 200, { message: "Upgrade requests fetched" });
    } catch (error) {
      console.error("[upgradeRequests:myRequests]", error);
      return sendError(res, "Failed to fetch upgrade requests", 500);
    }
  }
);

/**
 * @route GET /api/v1/admin/upgrades
 * @desc Admin list all pending / processed upgrade requests
 */
upgradeRequestsRouter.get(
  "/admin/upgrades",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const filterStatus = status ? String(status).toUpperCase() : "PENDING";

      const requests = await (prisma as any).upgradeRequest.findMany({
        where: { status: filterStatus },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return sendSuccess(res, requests, 200, { message: `Found ${requests.length} upgrade requests` });
    } catch (error) {
      console.error("[upgradeRequests:adminList]", error);
      return sendError(res, "Failed to list upgrade requests", 500);
    }
  }
);

/**
 * @route POST /api/v1/admin/upgrades/:id/approve
 * @desc Admin approves upgrade request, immediately activates new features & plan
 */
upgradeRequestsRouter.post(
  "/admin/upgrades/:id/approve",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adminNotes, paymentTxId } = req.body;
      const adminUser = (req as any).user;

      const upgradeReq = await (prisma as any).upgradeRequest.findUnique({ where: { id } });
      if (!upgradeReq) {
        return sendError(res, "Upgrade request not found", 404);
      }

      if (upgradeReq.status !== "PENDING") {
        return sendError(res, `Upgrade request is already ${upgradeReq.status}`, 400);
      }

      // Update upgrade request status
      const updatedReq = await (prisma as any).upgradeRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNotes: adminNotes || "Approved by Super Admin",
          paymentTxId: paymentTxId || `TX_${Date.now()}`,
          activatedAt: new Date(),
        },
      });

      // Execute immediate subscription plan switch if tenantId present
      if (upgradeReq.tenantId) {
        // Deactivate existing subscriptions
        await prisma.subscription.updateMany({
          where: { tenantId: upgradeReq.tenantId, status: "ACTIVE" },
          data: { status: "CANCELED", canceledAt: new Date() },
        });

        // Activate new subscription
        await prisma.subscription.create({
          data: {
            tenantId: upgradeReq.tenantId,
            planId: upgradeReq.requestedPlanId,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      await auditLog(
        adminUser?.userId || "admin",
        upgradeReq.tenantId,
        "UPGRADE_REQUEST_APPROVED",
        "UpgradeRequest",
        id,
        { requestedPlanId: upgradeReq.requestedPlanId, paymentTxId },
        req
      );

      return sendSuccess(res, updatedReq, 200, { message: "Upgrade request approved & new plan activated immediately" });
    } catch (error) {
      console.error("[upgradeRequests:approve]", error);
      return sendError(res, "Failed to approve upgrade request", 500);
    }
  }
);

/**
 * @route POST /api/v1/admin/upgrades/:id/reject
 * @desc Admin rejects upgrade request
 */
upgradeRequestsRouter.post(
  "/admin/upgrades/:id/reject",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;
      const adminUser = (req as any).user;

      const upgradeReq = await (prisma as any).upgradeRequest.findUnique({ where: { id } });
      if (!upgradeReq) {
        return sendError(res, "Upgrade request not found", 404);
      }

      const updatedReq = await (prisma as any).upgradeRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNotes: adminNotes || "Upgrade request rejected by Admin",
        },
      });

      await auditLog(
        adminUser?.userId || "admin",
        upgradeReq.tenantId,
        "UPGRADE_REQUEST_REJECTED",
        "UpgradeRequest",
        id,
        { reason: adminNotes },
        req
      );

      return sendSuccess(res, updatedReq, 200, { message: "Upgrade request rejected" });
    } catch (error) {
      console.error("[upgradeRequests:reject]", error);
      return sendError(res, "Failed to reject upgrade request", 500);
    }
  }
);
