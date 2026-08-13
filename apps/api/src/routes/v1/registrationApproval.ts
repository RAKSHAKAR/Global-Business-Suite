import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { auditLog } from "../../services/auditLogger";
import { sendSuccess, sendError } from "../../utils/responseHandler";

export const registrationApprovalRouter = Router();

/**
 * @route GET /api/v1/admin/registration-config
 * @desc Retrieve registration & verification rules for Admin, Partner, and Customer portals
 */
registrationApprovalRouter.get(
  "/admin/registration-config",
  authMiddleware,
  async (_req: Request, res: Response) => {
    try {
      let configs = await (prisma as any).registrationConfig.findMany();
      if (!configs || configs.length === 0) {
        // Initialize default rules per portal
        const defaults = [
          {
            portal: "ADMIN",
            allowRegistration: false,
            emailVerificationRequired: true,
            mobileOtpRequired: true,
            whatsAppOtpEnabled: false,
            documentUploadRequired: false,
            businessVerificationRequired: false,
            autoApprovalEnabled: false,
          },
          {
            portal: "PARTNER",
            allowRegistration: true,
            emailVerificationRequired: true,
            mobileOtpRequired: true,
            whatsAppOtpEnabled: false,
            documentUploadRequired: true,
            businessVerificationRequired: true,
            autoApprovalEnabled: false,
          },
          {
            portal: "CUSTOMER",
            allowRegistration: true,
            emailVerificationRequired: false,
            mobileOtpRequired: true,
            whatsAppOtpEnabled: true,
            documentUploadRequired: false,
            businessVerificationRequired: false,
            autoApprovalEnabled: true,
          },
        ];

        for (const item of defaults) {
          await (prisma as any).registrationConfig.create({ data: item }).catch(() => {});
        }
        configs = await (prisma as any).registrationConfig.findMany();
      }

      return sendSuccess(res, configs, 200, { message: "Registration configuration fetched" });
    } catch (error) {
      console.error("[registrationApproval:getConfig]", error);
      return sendError(res, "Failed to fetch registration configuration", 500);
    }
  }
);

/**
 * @route PUT /api/v1/admin/registration-config/:portal
 * @desc Update portal-specific registration & verification rules
 */
registrationApprovalRouter.put(
  "/admin/registration-config/:portal",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const portal = req.params.portal.toUpperCase();
      const data = req.body;

      const updated = await (prisma as any).registrationConfig.upsert({
        where: { portal },
        update: { ...data, updatedAt: new Date() },
        create: { portal, ...data },
      });

      const user = (req as any).user;
      await auditLog(
        user?.userId || "system",
        user?.tenantId || null,
        "REGISTRATION_CONFIG_UPDATED",
        "RegistrationConfig",
        updated.id,
        { portal, changes: data },
        req
      );

      return sendSuccess(res, updated, 200, { message: `Registration rules updated for ${portal}` });
    } catch (error) {
      console.error("[registrationApproval:updateConfig]", error);
      return sendError(res, "Failed to update registration rules", 500);
    }
  }
);

/**
 * @route GET /api/v1/admin/partner-approvals
 * @desc List partner applications by status (PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED, BLOCKED, ARCHIVED)
 */
registrationApprovalRouter.get(
  "/admin/partner-approvals",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const filterStatus = status ? String(status).toUpperCase() : "PENDING_APPROVAL";

      const partners = await prisma.user.findMany({
        where: {
          approvalStatus: filterStatus,
        },
        include: {
          partnerDocuments: true,
          tenant: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return sendSuccess(res, partners, 200, { message: `Found ${partners.length} partner registrations` });
    } catch (error) {
      console.error("[registrationApproval:listPartners]", error);
      return sendError(res, "Failed to list partner approvals", 500);
    }
  }
);

/**
 * @route POST /api/v1/admin/partner-approvals/:userId/review
 * @desc Review partner application: APPROVE, REJECT, SUSPEND, BLOCK, or ARCHIVE
 */
registrationApprovalRouter.post(
  "/admin/partner-approvals/:userId/review",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { action, comments, planId } = req.body;

      const validActions = ["APPROVE", "REJECT", "SUSPEND", "BLOCK", "ARCHIVE"];
      if (!action || !validActions.includes(action.toUpperCase())) {
        return sendError(res, `Invalid action. Allowed: ${validActions.join(", ")}`, 400);
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: true },
      });

      if (!targetUser) {
        return sendError(res, "Partner user not found", 404);
      }

      const newStatus = action.toUpperCase() === "APPROVE" ? "APPROVED" :
                        action.toUpperCase() === "REJECT" ? "REJECTED" :
                        action.toUpperCase() === "SUSPEND" ? "SUSPENDED" :
                        action.toUpperCase() === "BLOCK" ? "BLOCKED" : "ARCHIVED";

      const updatedUser = await (prisma as any).user.update({
        where: { id: userId },
        data: {
          approvalStatus: newStatus,
          isActive: newStatus === "APPROVED",
        },
      });

      // If approved and tenant exists, assign plan
      if (newStatus === "APPROVED" && targetUser.tenantId) {
        const targetPlanId = planId || (await prisma.plan.findFirst({ where: { isActive: true } }))?.id;
        if (targetPlanId) {
          await prisma.subscription.create({
            data: {
              tenantId: targetUser.tenantId,
              planId: targetPlanId,
              status: "ACTIVE",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          }).catch(() => {});
        }
      }

      const adminUser = (req as any).user;
      await auditLog(
        adminUser?.userId || "admin",
        targetUser.tenantId,
        `PARTNER_${newStatus}`,
        "User",
        userId,
        { action, comments, planId },
        req
      );

      return sendSuccess(res, updatedUser, 200, { message: `Partner status updated to ${newStatus}` });
    } catch (error) {
      console.error("[registrationApproval:reviewPartner]", error);
      return sendError(res, "Failed to process partner review", 500);
    }
  }
);

/**
 * @route POST /api/v1/partners/upload-documents
 * @desc Upload business verification document for partner onboarding
 */
registrationApprovalRouter.post(
  "/partners/upload-documents",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { businessName, documentType, documentUrl } = req.body;

      if (!documentUrl || !documentType) {
        return sendError(res, "documentUrl and documentType are required", 400);
      }

      const doc = await (prisma as any).partnerVerificationDocument.create({
        data: {
          userId: user.userId,
          businessName: businessName || "Partner Business",
          documentType,
          documentUrl,
          status: "PENDING",
        },
      });

      return sendSuccess(res, doc, 200, { message: "Partner document uploaded successfully" });
    } catch (error) {
      console.error("[registrationApproval:uploadDoc]", error);
      return sendError(res, "Failed to upload partner document", 500);
    }
  }
);
