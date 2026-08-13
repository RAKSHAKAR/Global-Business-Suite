import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { auditLog } from "../../services/auditLogger";
import { EnterpriseCaptchaService } from "../../services/captchaService";
import { sendSuccess, sendError } from "../../utils/responseHandler";
import { JWT_SECRET, JWT_EXPIRES_IN, getSignOptions } from "../../config/jwt";
import {
  AppleIdentityProviderUnavailableError,
  AppleIdentityTokenError,
  verifyAppleIdentityToken,
} from "../../services/appleIdentityTokenService";

export const authRouter = Router();

// Google OAuth2 client for server-side ID token verification
const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createPartnerSubdomain(businessName: string): string {
  const base = businessName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "partner";
  return `${base}-${crypto.randomBytes(6).toString("hex")}`;
}

// Strict rate limiter for auth mutations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === "test",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again in 15 minutes.",
  },
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
authRouter.post("/register", authLimiter, async (req: Request, res: Response) => {
  try {
    const {
      email: rawEmail,
      password,
      firstName,
      lastName,
      tenantId,
      role,
      businessName,
      tenantName,
      documentType,
      documentUrl,
    } = req.body || {};
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    if (!email || !password) {
      return sendError(res, "Email and password are required", 400, "VALIDATION_ERROR");
    }
    if (password.length < 8) {
      return sendError(res, "Password must be at least 8 characters", 400, "VALIDATION_ERROR");
    }

    const submittedRole = String(role || "CUSTOMER")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
    if (["ADMIN", "SUPER_ADMIN", "SYSTEM_ADMIN", "PLATFORM_ADMIN"].includes(submittedRole)) {
      return sendError(
        res,
        "Admin accounts cannot be self-registered. Admins can only be created by Super Admin.",
        403,
        "FORBIDDEN",
      );
    }

    const requestedRole = submittedRole === "CUSTOMER_USER" ? "CUSTOMER" : submittedRole;
    if (!new Set(["CUSTOMER", "PARTNER"]).has(requestedRole)) {
      return sendError(
        res,
        "Public registration only supports Customer or Partner onboarding.",
        400,
        "INVALID_REGISTRATION_ROLE",
      );
    }

    // A public request must never choose an existing tenant. Membership in an
    // existing organization is granted only through an authenticated invite or
    // administrator-controlled flow.
    if (tenantId !== undefined && tenantId !== null && tenantId !== "") {
      return sendError(
        res,
        "Public registration cannot select an existing tenant.",
        400,
        "CALLER_TENANT_NOT_ALLOWED",
      );
    }

    const isPartner = requestedRole === "PARTNER";
    const partnerBusinessName = String(businessName || tenantName || "").trim();
    if (isPartner && !partnerBusinessName) {
      return sendError(
        res,
        "A business name is required for Partner onboarding.",
        400,
        "BUSINESS_NAME_REQUIRED",
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, "Email already in use", 400, "DUPLICATE_EMAIL");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const approvalStatus = isPartner ? "PENDING_APPROVAL" : "APPROVED";

    const user = await prisma.$transaction(async (tx) => {
      let serverAssignedTenantId: string | null = null;

      if (isPartner) {
        const tenant = await tx.tenant.create({
          data: {
            name: partnerBusinessName,
            subdomain: createPartnerSubdomain(partnerBusinessName),
            isActive: true,
          },
        });
        serverAssignedTenantId = tenant.id;
      }

      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          tenantId: serverAssignedTenantId,
          approvalStatus,
          isActive: !isPartner,
        },
      });

      if (isPartner && serverAssignedTenantId) {
        const partnerRole = await tx.role.create({
          data: {
            name: "Partner",
            description: "Partner access within tenant",
            tenantId: serverAssignedTenantId,
          },
        });
        const partnerPermissions = await tx.permission.findMany({
          where: {
            OR: [
              { resource: "social", action: "create" },
              { resource: "social", action: "read" },
              { resource: "social", action: "approve" },
              { resource: "social", action: "publish" },
              { resource: "clients", action: "manage" },
              { resource: "support", action: "manage" },
            ],
          },
          select: { id: true },
        });
        if (partnerPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: partnerPermissions.map(({ id: permissionId }) => ({
              roleId: partnerRole.id,
              permissionId,
            })),
          });
        }
        await tx.userRole.create({
          data: { userId: createdUser.id, roleId: partnerRole.id },
        });

        if (documentUrl) {
          await tx.partnerVerificationDocument.create({
            data: {
              userId: createdUser.id,
              businessName: partnerBusinessName,
              documentType: documentType || "BUSINESS_LICENSE",
              documentUrl,
              status: "PENDING",
            },
          });
        }
      }

      return createdUser;
    });

    await auditLog(
      user.id,
      user.tenantId,
      isPartner ? "PARTNER_REGISTRATION_SUBMITTED" : "CUSTOMER_REGISTERED",
      "User",
      user.id,
      { email, role: requestedRole, approvalStatus },
      req,
    );

    return sendSuccess(
      res,
      {
        message: isPartner
          ? "Partner registration submitted successfully. Pending Admin approval."
          : "Customer account created successfully.",
        userId: user.id,
        approvalStatus,
        requiresApproval: isPartner,
        onboardingRequired: !user.tenantId,
      },
      201,
    );
  } catch (error) {
    console.error("[authRouter:register]", error);
    return sendError(res, "Registration failed", 500, "REGISTER_ERROR");
  }
});

/**
 * @swagger
 * /api/v1/auth/captcha:
 *   get:
 *     summary: Generate CAPTCHA
 *     tags: [Auth]
 */
authRouter.get("/captcha", async (_req: Request, res: Response) => {
  try {
    const { id, imageSvg, audioEnabled, text } =
      await EnterpriseCaptchaService.generateCaptcha();
    const payload = {
      id,
      image: imageSvg,
      audioEnabled,
      audioUrl: `/api/v1/auth/captcha/audio/${id}`,
      audioText: text,
    };
    return res.json({
      success: true,
      data: payload,
      ...payload,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error("[authRouter:captcha]", error);
    return sendError(res, "Failed to generate CAPTCHA", 500, "CAPTCHA_ERROR");
  }
});

authRouter.get("/captcha/audio/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const audioBuffer = EnterpriseCaptchaService.getAudioBuffer(id);
    if (!audioBuffer) {
      return sendError(res, "Audio CAPTCHA not found or expired", 404, "NOT_FOUND");
    }
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Accept-Ranges", "bytes");
    return res.send(audioBuffer);
  } catch (error) {
    console.error("[authRouter:captchaAudio]", error);
    return sendError(res, "Failed to retrieve audio CAPTCHA", 500, "CAPTCHA_AUDIO_ERROR");
  }
});

authRouter.post("/captcha/verify-check", async (req: Request, res: Response) => {
  try {
    const { captchaId, captchaToken } = req.body;
    if (!captchaId || !captchaToken) {
      return res.status(400).json({ valid: false, error: "CAPTCHA token and ID are required" });
    }
    const valid = EnterpriseCaptchaService.checkCaptchaText(captchaId, captchaToken);
    if (valid) {
      return res.json({ valid: true });
    }
    return res.status(400).json({ valid: false, error: "Incorrect CAPTCHA code" });
  } catch (error) {
    console.error("[authRouter:captchaVerifyCheck]", error);
    return res.status(500).json({ valid: false, error: "CAPTCHA verification check failed" });
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 */
authRouter.post("/login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, captchaId, captchaToken } = req.body;
    if (!email || !password) {
      return sendError(res, "Email and password required", 400, "VALIDATION_ERROR");
    }

    if (captchaId && captchaToken) {
      const captchaResult = EnterpriseCaptchaService.verifyCaptcha(
        captchaId,
        captchaToken,
      );
      if (!captchaResult.success) {
        await prisma.loginHistory
          .create({
            data: {
              userId: "unknown",
              ipAddress: req.ip,
              userAgent: req.get("User-Agent"),
              isSuccess: false,
              failureReason: captchaResult.error,
            },
          })
          .catch(() => {});
        return sendError(
          res,
          captchaResult.error || "CAPTCHA verification failed",
          401,
          "CAPTCHA_FAILED",
        );
      }
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      await prisma.loginHistory
        .create({
          data: {
            userId: user?.id || "unknown",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            isSuccess: false,
            failureReason: "User not found",
          },
        })
        .catch(() => {});
      return sendError(res, "Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const isSuspended = (user as any).isSuspended || user.approvalStatus === "SUSPENDED";
    const approvalStatus = (user as any).approvalStatus || "APPROVED";

    if (approvalStatus === "PENDING_APPROVAL") {
      return res.status(403).json({
        success: false,
        error: "Account is currently PENDING_APPROVAL. Access restricted.",
        code: "APPROVAL_RESTRICTED",
        approvalStatus,
        requiresApproval: true,
      });
    }

    if (!user.isActive && !isSuspended) {
      return sendError(res, "Account is disabled. Contact support.", 403, "ACCOUNT_DISABLED");
    }

    if (isSuspended) {
      const allowSuspendedLoginSetting = await prisma.platformSetting.findUnique({
        where: { key: "ALLOW_SUSPENDED_USER_LOGIN" },
      });
      const allowSuspendedLogin = allowSuspendedLoginSetting ? allowSuspendedLoginSetting.value === "true" : true;

      if (!allowSuspendedLogin) {
        return res.status(403).json({
          success: false,
          error: "Suspended user login is disabled by Admin Policy.",
          code: "ACCOUNT_SUSPENDED",
          approvalStatus: "SUSPENDED",
        });
      }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await prisma.loginHistory
        .create({
          data: {
            userId: user.id,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            isSuccess: false,
            failureReason: "Wrong password",
          },
        })
        .catch(() => {});
      return sendError(res, "Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // Determine tenant subscription status
    let subscriptionStatus = "ACTIVE";
    if (user.tenantId) {
      const activeSub = await prisma.subscription.findFirst({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: "desc" },
      });
      if (!activeSub || ["EXPIRED", "PAST_DUE", "CANCELED"].includes(activeSub.status)) {
        subscriptionStatus = activeSub?.status || "EXPIRED";
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        approvalStatus,
        isSuspended,
        subscriptionStatus,
      },
      JWT_SECRET,
      getSignOptions(),
    );

    await prisma.loginHistory
      .create({
        data: {
          userId: user.id,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          isSuccess: true,
        },
      })
      .catch(() => {});

    await auditLog(
      user.id,
      user.tenantId,
      "USER_LOGIN",
      "User",
      user.id,
      { email, isSuspended, subscriptionStatus },
      req,
    );

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        approvalStatus,
        isSuspended,
        subscriptionStatus,
      },
    });
  } catch (error) {
    console.error("[authRouter:login]", error);
    return sendError(res, "Login failed", 500, "LOGIN_ERROR");
  }
});

/**
 * Google SSO Login — SECURE: Verifies ID token via Google OAuth2 public keys.
 * SECURITY FIX (C-03): Previously accepted raw email/googleId from body without verification.
 */
authRouter.post("/google-login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { idToken, captchaId, captchaToken } = req.body;

    if (!idToken) {
      return sendError(
        res,
        "Google ID token (idToken) is required for Google SSO",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("[authRouter:googleLogin] GOOGLE_CLIENT_ID env var not configured");
      return sendError(res, "Google SSO is not configured on this server", 503, "SSO_NOT_CONFIGURED");
    }

    // SECURITY: Verify the Google ID token against Google's public certificate
    let googlePayload: any;
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload();
      if (!googlePayload || !googlePayload.email || !googlePayload.sub) {
        return sendError(res, "Invalid Google token: missing identity claims", 401, "INVALID_SSO_TOKEN");
      }
      if (googlePayload.email_verified === false) {
        return sendError(res, "Google account email is not verified", 401, "INVALID_SSO_TOKEN");
      }
    } catch (verifyErr) {
      console.error("[authRouter:googleLogin] Token verification failed", verifyErr);
      return sendError(res, "Google token verification failed. Ensure you are using a valid Google account.", 401, "INVALID_SSO_TOKEN");
    }

    if (captchaId && captchaToken) {
      const captchaResult = EnterpriseCaptchaService.verifyCaptcha(captchaId, captchaToken);
      if (!captchaResult.success) {
        return sendError(res, captchaResult.error || "CAPTCHA verification failed", 401, "CAPTCHA_FAILED");
      }
    }

    const {
      email: rawGoogleEmail,
      given_name: firstName,
      family_name: lastName,
      sub: googleId,
    } = googlePayload;
    const email = String(rawGoogleEmail).trim().toLowerCase();

    const linkedGoogleAccount = await prisma.providerAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleId,
        },
      },
      include: { user: true },
    });
    let user = linkedGoogleAccount?.user || await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: firstName || "Customer",
          lastName: lastName || "User",
          tenantId: null,
          isActive: true,
          emailVerified: new Date(),
        },
      });
    }

    if (!user.isActive || user.isDeleted || user.isSuspended) {
      return sendError(res, "Account is disabled. Contact support.", 403, "ACCOUNT_DISABLED");
    }

    if (!linkedGoogleAccount) {
      await prisma.providerAccount.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "google",
          providerAccountId: googleId,
        },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId, provider: "google" },
      JWT_SECRET,
      getSignOptions(),
    );

    await auditLog(user.id, user.tenantId, "USER_GOOGLE_SSO_LOGIN", "User", user.id, { email }, req);

    return sendSuccess(res, {
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, tenantId: user.tenantId, provider: "google" },
      onboardingRequired: !user.tenantId,
    });
  } catch (error) {
    console.error("[authRouter:googleLogin]", error);
    return sendError(res, "Google SSO authentication failed", 500, "SSO_ERROR");
  }
});

/**
 * Mobile SMS, WhatsApp & Email OTP Request Endpoint
 */
authRouter.post("/otp/send", authLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, channel } = req.body; // channel: SMS, WHATSAPP, EMAIL
    if (!identifier) {
      return sendError(res, "Mobile number or Email address is required", 400, "VALIDATION_ERROR");
    }

    const type = channel === "WHATSAPP" ? "WHATSAPP_OTP" : channel === "EMAIL" ? "EMAIL_VERIFICATION" : "MOBILE_OTP";
    const { OtpService } = await import("../../services/otpService");
    const result = await OtpService.sendOtp(identifier, type as any);

    return sendSuccess(res, {
      ...result,
      channel: channel || "SMS",
      identifier,
    });
  } catch (error) {
    console.error("[authRouter:otpSend]", error);
    return sendError(res, "Failed to send OTP", 500, "OTP_SEND_ERROR");
  }
});

/**
 * Mobile SMS, WhatsApp & Email OTP Verify & Login Endpoint
 * SECURITY FIX (H-06): No longer auto-provisions unknown users.
 * Users must register first before using OTP login.
 */
authRouter.post("/otp/verify", authLimiter, async (req: Request, res: Response) => {
  try {
    const { identifier, token, channel } = req.body;
    if (!identifier || !token) {
      return sendError(res, "Identifier and OTP token are required", 400, "VALIDATION_ERROR");
    }

    const type = channel === "WHATSAPP" ? "WHATSAPP_OTP" : channel === "EMAIL" ? "EMAIL_VERIFICATION" : "MOBILE_OTP";
    const { OtpService } = await import("../../services/otpService");
    const verification = await OtpService.verifyOtp(identifier, token, type as any);

    if (!verification.valid) {
      return sendError(res, verification.error || "Invalid OTP code", 400, "INVALID_OTP");
    }

    // SECURITY FIX: Do NOT auto-provision unknown users via OTP.
    // Require explicit registration first to prevent orphaned accounts
    // and to enforce approval workflows for partners.
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phoneNumber: identifier }],
      },
    });

    if (!user) {
      return sendError(
        res,
        "No account found for this identifier. Please register an account first before using OTP login.",
        404,
        "USER_NOT_FOUND",
      );
    }

    // Check account status before granting access
    if (!user.isActive) {
      return sendError(res, "Account is disabled. Contact support.", 403, "ACCOUNT_DISABLED");
    }

    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId, loginType: "OTP", channel: channel || "SMS" },
      JWT_SECRET,
      getSignOptions(),
    );

    await auditLog(user.id, user.tenantId, "USER_OTP_LOGIN", "User", user.id, { identifier, channel }, req);

    return sendSuccess(res, {
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error("[authRouter:otpVerify]", error);
    return sendError(res, "OTP verification failed", 500, "OTP_VERIFY_ERROR");
  }
});

/**
 * Apple SSO Login Endpoint
 * SECURITY FIX (C-04): Verifies Apple's RS256 signature through Apple JWKS,
 * then validates issuer, audience, expiry, and subject claims.
 */
authRouter.post("/apple-login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { identityToken, user: appleUser } = req.body;
    if (!identityToken || typeof identityToken !== "string") {
      return sendError(res, "Apple identity token is required", 400, "VALIDATION_ERROR");
    }

    if (!process.env.APPLE_CLIENT_ID) {
      console.error("[authRouter:appleLogin] APPLE_CLIENT_ID env var not configured");
      return sendError(res, "Apple SSO is not configured on this server", 503, "SSO_NOT_CONFIGURED");
    }

    let applePayload;
    try {
      applePayload = await verifyAppleIdentityToken(
        identityToken,
        process.env.APPLE_CLIENT_ID,
      );
    } catch (verificationError) {
      if (verificationError instanceof AppleIdentityProviderUnavailableError) {
        console.error("[authRouter:appleLogin] Apple JWKS unavailable", verificationError);
        return sendError(
          res,
          "Apple identity verification is temporarily unavailable",
          503,
          "SSO_PROVIDER_UNAVAILABLE",
        );
      }
      const code = verificationError instanceof AppleIdentityTokenError
        ? verificationError.code
        : "INVALID_SSO_TOKEN";
      const message = verificationError instanceof AppleIdentityTokenError
        ? verificationError.message
        : "Apple token validation failed";
      console.error("[authRouter:appleLogin] Token verification failed", verificationError);
      return sendError(res, message, 401, code);
    }

    const appleUserId = applePayload.sub;
    const linkedAppleAccount = await prisma.providerAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "apple",
          providerAccountId: appleUserId,
        },
      },
      include: { user: true },
    });

    // The separate `user` request body is not signed and must never be used to
    // identify or bind an account. Apple only includes email on first consent,
    // so returning users are resolved by the verified `sub` provider link.
    const verifiedEmail = applePayload.email?.trim().toLowerCase();
    if (!linkedAppleAccount && !verifiedEmail) {
      return sendError(
        res,
        "Apple did not provide a verified email and no existing provider link was found.",
        400,
        "EMAIL_REQUIRED",
      );
    }
    if (
      !linkedAppleAccount &&
      (applePayload.email_verified === false || applePayload.email_verified === "false")
    ) {
      return sendError(res, "Apple account email is not verified", 401, "INVALID_SSO_TOKEN");
    }

    let user = linkedAppleAccount?.user || await prisma.user.findUnique({
      where: { email: verifiedEmail! },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: verifiedEmail!,
          firstName: appleUser?.name?.firstName || "Apple",
          lastName: appleUser?.name?.lastName || "User",
          emailVerified: new Date(),
          isActive: true,
        },
      });
    }

    if (!user.isActive || user.isDeleted || user.isSuspended) {
      return sendError(res, "Account is disabled. Contact support.", 403, "ACCOUNT_DISABLED");
    }

    if (!linkedAppleAccount) {
      await prisma.providerAccount.create({
        data: {
          userId: user.id,
          type: "oauth",
          provider: "apple",
          providerAccountId: appleUserId,
        },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId, provider: "apple" },
      JWT_SECRET,
      getSignOptions(),
    );

    await auditLog(user.id, user.tenantId, "USER_APPLE_SSO_LOGIN", "User", user.id, { email: user.email }, req);

    return sendSuccess(res, {
      token,
      user: { id: user.id, email: user.email, tenantId: user.tenantId, provider: "apple" },
      onboardingRequired: !user.tenantId,
    });
  } catch (error) {
    console.error("[authRouter:appleLogin]", error);
    return sendError(res, "Apple authentication failed", 500, "APPLE_AUTH_ERROR");
  }
});

/**
 * Microsoft SSO Login Endpoint
 * SECURITY FIX (C-05): Validates the Microsoft access token by calling MS Graph API
 * to retrieve the authenticated user's profile before granting access.
 */
authRouter.post("/microsoft-login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { accessToken, email: bodyEmail } = req.body;
    if (!accessToken || typeof accessToken !== "string") {
      return sendError(res, "Microsoft access token is required", 400, "VALIDATION_ERROR");
    }

    // TEST MODE: Bypass real MS Graph API call when explicitly requested by test suite
    if (process.env.NODE_ENV === "test" && process.env.TEST_SSO_BYPASS === "true") {
      const email = bodyEmail || "msuser@example.com";
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: { email, firstName: "Microsoft", lastName: "Test", emailVerified: new Date(), isActive: true },
        });
      }
      const token = jwt.sign(
        { userId: user.id, email: user.email, tenantId: user.tenantId, provider: "microsoft" },
        JWT_SECRET, getSignOptions(),
      );
      return sendSuccess(res, { token, user: { id: user.id, email: user.email, provider: "microsoft" } });
    }

    // SECURITY: Verify the Microsoft access token by calling the MS Graph API
    // This ensures the token is valid and not forged
    let msProfile: { id: string; mail?: string; userPrincipalName?: string; displayName?: string; givenName?: string; surname?: string };
    try {
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000), // 5s timeout to prevent SSRF amplification
      });

      if (!graphResponse.ok) {
        const errorData = await graphResponse.json().catch(() => ({})) as any;
        console.error("[authRouter:microsoftLogin] MS Graph API error", graphResponse.status, errorData);
        return sendError(
          res,
          "Microsoft token verification failed. Token may be expired or invalid.",
          401,
          "INVALID_SSO_TOKEN",
        );
      }

      msProfile = await graphResponse.json() as typeof msProfile;
    } catch (fetchErr: any) {
      if (fetchErr?.name === "TimeoutError" || fetchErr?.name === "AbortError") {
        return sendError(res, "Microsoft identity verification timed out. Please try again.", 504, "SSO_TIMEOUT");
      }
      console.error("[authRouter:microsoftLogin] Graph API fetch error", fetchErr);
      return sendError(res, "Microsoft authentication service unavailable", 503, "SSO_UNAVAILABLE");
    }

    const email = msProfile.mail || msProfile.userPrincipalName;
    if (!email) {
      return sendError(res, "Microsoft profile does not have a valid email address", 400, "EMAIL_REQUIRED");
    }

    const msUserId = msProfile.id;
    const displayName = msProfile.displayName || msProfile.givenName || "Microsoft User";

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: msProfile.givenName || displayName,
          lastName: msProfile.surname,
          emailVerified: new Date(),
          isActive: true,
        },
      });
    }

    // Upsert Microsoft provider account
    await prisma.providerAccount
      .upsert({
        where: { provider_providerAccountId: { provider: "microsoft", providerAccountId: msUserId } },
        update: { userId: user.id },
        create: { userId: user.id, type: "oauth", provider: "microsoft", providerAccountId: msUserId },
      })
      .catch(() => {});

    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId, provider: "microsoft" },
      JWT_SECRET,
      getSignOptions(),
    );

    await auditLog(user.id, user.tenantId, "USER_MICROSOFT_SSO_LOGIN", "User", user.id, { email }, req);

    return sendSuccess(res, { token, user: { id: user.id, email: user.email, provider: "microsoft" } });
  } catch (error) {
    console.error("[authRouter:microsoftLogin]", error);
    return sendError(res, "Microsoft authentication failed", 500, "MS_AUTH_ERROR");
  }
});

/**
 * GitHub SSO Login Endpoint
 * NOTE: GitHub OAuth requires exchanging the authorization code server-side.
 * SECURITY: Validates the GitHub access token by calling the GitHub API.
 */
authRouter.post("/github-login", authLimiter, async (req: Request, res: Response) => {
  try {
    // Support both `githubAccessToken` (production) and `code` (OAuth flow / test) param names
    const { githubAccessToken, code, email, username } = req.body;
    const ghToken = githubAccessToken || code;

    if (!ghToken || typeof ghToken !== "string") {
      return sendError(
        res,
        "GitHub access token or authorization code is required",
        400,
        "VALIDATION_ERROR",
      );
    }

    // TEST MODE: Bypass real GitHub API call when explicitly requested by test suite
    if (process.env.NODE_ENV === "test" && process.env.TEST_SSO_BYPASS === "true") {
      const verifiedEmail = email || "ghuser@example.com";
      let user = await prisma.user.findUnique({ where: { email: verifiedEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: { email: verifiedEmail, firstName: username || "GitHub", lastName: "Test", emailVerified: new Date(), isActive: true },
        });
      }
      const token = jwt.sign(
        { userId: user.id, email: user.email, tenantId: user.tenantId, provider: "github" },
        JWT_SECRET, getSignOptions(),
      );
      return sendSuccess(res, { token, user: { id: user.id, email: user.email, provider: "github" } });
    }

    // SECURITY: Verify the GitHub access token by calling GitHub API
    let ghProfile: { id: number; email?: string; name?: string; login?: string };
    try {
      const ghResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!ghResponse.ok) {
        return sendError(res, "GitHub token verification failed. Token may be expired or invalid.", 401, "INVALID_SSO_TOKEN");
      }

      ghProfile = await ghResponse.json() as typeof ghProfile;
    } catch (fetchErr: any) {
      if (fetchErr?.name === "TimeoutError" || fetchErr?.name === "AbortError") {
        return sendError(res, "GitHub identity verification timed out. Please try again.", 504, "SSO_TIMEOUT");
      }
      console.error("[authRouter:githubLogin] GitHub API fetch error", fetchErr);
      return sendError(res, "GitHub authentication service unavailable", 503, "SSO_UNAVAILABLE");
    }

    // GitHub users may not have a public email — use provided email as fallback
    const verifiedEmail = ghProfile.email || email;
    if (!verifiedEmail) {
      return sendError(
        res,
        "GitHub profile does not have a public email. Please provide your email address.",
        400,
        "EMAIL_REQUIRED",
      );
    }

    const ghUserId = String(ghProfile.id);

    let user = await prisma.user.findUnique({ where: { email: verifiedEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: verifiedEmail,
          firstName: ghProfile.name || ghProfile.login || username || "GitHub User",
          emailVerified: new Date(),
          isActive: true,
        },
      });
    }

    // Upsert GitHub provider account
    await prisma.providerAccount
      .upsert({
        where: { provider_providerAccountId: { provider: "github", providerAccountId: ghUserId } },
        update: { userId: user.id },
        create: { userId: user.id, type: "oauth", provider: "github", providerAccountId: ghUserId },
      })
      .catch(() => {});

    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId, provider: "github" },
      JWT_SECRET,
      getSignOptions(),
    );

    await auditLog(user.id, user.tenantId, "USER_GITHUB_SSO_LOGIN", "User", user.id, { email: verifiedEmail }, req);

    return sendSuccess(res, { token, user: { id: user.id, email: user.email, provider: "github" } });
  } catch (error) {
    console.error("[authRouter:githubLogin]", error);
    return sendError(res, "GitHub authentication failed", 500, "GITHUB_AUTH_ERROR");
  }
});

/**
 * Future Ready Passkeys WebAuthn Endpoints
 */
authRouter.post("/passkeys/register", authMiddleware, async (req: Request, res: Response) => {
  return sendSuccess(res, {
    challenge: crypto.randomBytes(32).toString("base64url"),
    rp: { name: "Global Business Suite Platform", id: "gbs.local" },
    user: { id: (req as any).user.userId, name: (req as any).user.email, displayName: (req as any).user.email },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
    authenticatorSelection: { userVerification: "preferred" },
    status: "PASSKEY_REGISTRATION_CHALLENGE_READY",
  });
});

authRouter.post("/passkeys/authenticate", authLimiter, async (req: Request, res: Response) => {
  return sendSuccess(res, {
    challenge: crypto.randomBytes(32).toString("base64url"),
    status: "PASSKEY_AUTH_CHALLENGE_READY",
  });
});


authRouter.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return sendError(res, "User not found", 404, "NOT_FOUND");

    const permissions = new Set<string>();
    user.roles.forEach((r: any) => {
      r.role.permissions.forEach((p: any) => {
        permissions.add(`${p.permission.resource}:${p.permission.action}`);
      });
    });

    const { passwordHash, ...safeUser } = user;
    return sendSuccess(res, { ...safeUser, compiledPermissions: Array.from(permissions) });
  } catch (error) {
    console.error("[authRouter:me]", error);
    return sendError(res, "Failed to fetch user profile", 500, "PROFILE_ERROR");
  }
});

authRouter.post("/logout", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const userId = authReq.user?.userId;

    if (userId) {
      const allDevices = req.body?.allDevices === true;
      if (allDevices) {
        await prisma.session.deleteMany({ where: { userId } });
      } else {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(" ")[1];
        if (token) {
          await prisma.session.deleteMany({
            where: { userId, sessionToken: token },
          });
        }
      }

      await auditLog(
        userId,
        authReq.user?.tenantId,
        allDevices ? "USER_LOGOUT_ALL_DEVICES" : "USER_LOGOUT",
        "User",
        userId,
        { allDevices: allDevices ?? false },
        req,
      );
    }

    return sendSuccess(res, { message: "Logged out successfully" });
  } catch (error) {
    console.error("[authRouter:logout]", error);
    return sendError(res, "Logout failed", 500, "LOGOUT_ERROR");
  }
});

authRouter.post("/forgot-password", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return sendError(res, "A valid email address is required", 400, "VALIDATION_ERROR");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendSuccess(res, {
        message: "If an account with that email exists, a reset link will be sent.",
      });
    }

    await (prisma as any).passwordResetToken.deleteMany({ where: { email } });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await (prisma as any).passwordResetToken.create({
      data: { email, tokenHash, expiresAt },
    });

    const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    console.info(`[forgot-password] Reset link for ${email}: ${resetLink}`);

    await auditLog(user.id, user.tenantId, "PASSWORD_RESET_REQUESTED", "User", user.id, { email }, req);

    return sendSuccess(res, {
      message: "If an account with that email exists, a reset link will be sent.",
      ...(process.env.NODE_ENV !== "production" && { resetToken: rawToken }),
    });
  } catch (error) {
    console.error("[authRouter:forgotPassword]", error);
    return sendError(res, "Password reset request failed", 500, "FORGOT_PASSWORD_ERROR");
  }
});

authRouter.post("/reset-password", authLimiter, async (req: Request, res: Response) => {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) {
      return sendError(res, "token, email, and newPassword are required", 400, "VALIDATION_ERROR");
    }
    if (newPassword.length < 8) {
      return sendError(res, "Password must be at least 8 characters", 400, "VALIDATION_ERROR");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetRecord = await (prisma as any).passwordResetToken.findFirst({
      where: { email, tokenHash, expiresAt: { gt: new Date() } },
    });

    if (!resetRecord) {
      return sendError(res, "Invalid or expired password reset token", 400, "INVALID_TOKEN");
    }

    // SECURITY FIX (H-05): Check password reuse against last 5 passwords
    const passwordHistory = await prisma.passwordHistory.findMany({
      where: { userId: resetRecord.userId || undefined },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Check the current password hash from the user record too
    const userForReset = await prisma.user.findUnique({ where: { email } });
    if (!userForReset) {
      return sendError(res, "User not found", 404, "NOT_FOUND");
    }

    const allHashes = [
      ...(userForReset.passwordHash ? [userForReset.passwordHash] : []),
      ...passwordHistory.map((h: any) => h.passwordHash),
    ];

    for (const oldHash of allHashes) {
      const isReused = await bcrypt.compare(newPassword, oldHash);
      if (isReused) {
        return sendError(
          res,
          "New password cannot be the same as a previously used password. Please choose a different password.",
          400,
          "PASSWORD_REUSE_DENIED",
        );
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Store old password in history before updating
    if (userForReset.passwordHash) {
      await prisma.passwordHistory.create({
        data: { userId: userForReset.id, passwordHash: userForReset.passwordHash },
      }).catch(() => {});
    }

    await prisma.user.update({
      where: { email },
      data: { passwordHash, lastPasswordChange: new Date() },
    });

    // Invalidate all sessions on password reset
    await prisma.session.deleteMany({ where: { userId: userForReset.id } });
    await (prisma as any).passwordResetToken.delete({ where: { id: resetRecord.id } });

    await auditLog(userForReset.id, userForReset.tenantId, "PASSWORD_RESET_COMPLETED", "User", userForReset.id, { email }, req);

    return sendSuccess(res, { message: "Password reset successfully. Please log in with your new password." });
  } catch (error) {
    console.error("[authRouter:resetPassword]", error);
    return sendError(res, "Password reset failed", 500, "RESET_PASSWORD_ERROR");
  }
});
