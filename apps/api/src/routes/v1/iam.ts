import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../../middleware/auth";
import { EnterpriseIamConfigService } from "../../services/iamConfigService";
import { PasswordPolicyEngine } from "../../services/passwordPolicyEngine";
import { OtpService } from "../../services/otpService";
import { SessionDeviceService } from "../../services/sessionDeviceService";
import { auditLog } from "../../services/auditLogger";

export const iamRouter = Router();

// ── 1. Public / Client OAuth Providers Listing ──────────────────────────────
iamRouter.get("/providers", async (_req: Request, res: Response) => {
  try {
    const providers = await EnterpriseIamConfigService.getProviders();
    const publicProviders = providers.map((p) => ({
      provider: p.provider,
      isEnabled: p.isEnabled,
      clientId: p.clientId,
      redirectUri: p.redirectUri,
      scopes: p.scopes,
    }));
    res.json({ providers: publicProviders });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch OAuth providers" });
  }
});

// ── 2. Admin OAuth Provider Management ─────────────────────────────────────
iamRouter.get("/admin/providers", authMiddleware, async (req: Request, res: Response) => {
  try {
    const providers = await EnterpriseIamConfigService.getProviders();
    res.json({ providers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch OAuth providers" });
  }
});

iamRouter.put("/admin/providers", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { provider, isEnabled, clientId, clientSecret, redirectUri, callbackUrl, scopes, additionalSettings } = req.body;
    if (!provider) {
      return res.status(400).json({ error: "Provider name is required." });
    }

    const updated = await EnterpriseIamConfigService.upsertProvider({
      provider,
      isEnabled,
      clientId,
      clientSecret,
      redirectUri,
      callbackUrl,
      scopes,
      additionalSettings,
    });

    const user = (req as any).user;
    await auditLog(user.id, user.tenantId, "OAUTH_PROVIDER_UPDATED", "AuthProviderConfig", updated.id, { provider }, req);

    res.json({ message: "OAuth Provider updated successfully", provider: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update OAuth provider" });
  }
});

// ── 3. Admin Security Policy Configuration ──────────────────────────────────
iamRouter.get("/admin/policy", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const policy = await EnterpriseIamConfigService.getSecurityPolicy();
    res.json({ policy });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch security policy" });
  }
});

iamRouter.put("/admin/policy", authMiddleware, async (req: Request, res: Response) => {
  try {
    const updated = await EnterpriseIamConfigService.updateSecurityPolicy(req.body);
    const user = (req as any).user;
    await auditLog(user.id, user.tenantId, "SECURITY_POLICY_UPDATED", "PlatformSetting", "IAM_POLICY", req.body, req);

    res.json({ message: "Security policy updated successfully", policy: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update security policy" });
  }
});

// ── 4. Email & Mobile OTP Verification Endpoints ───────────────────────────
iamRouter.post("/verify-email/send", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const result = await OtpService.sendOtp(email, "EMAIL_VERIFICATION");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

iamRouter.post("/verify-email/confirm", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email and code are required" });

    const result = await OtpService.verifyOtp(email, code, "EMAIL_VERIFICATION");
    if (!result.valid) return res.status(400).json({ error: result.error });

    res.json({ message: "Email verified successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Email verification failed" });
  }
});

iamRouter.post("/mobile-otp/send", async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Phone number is required" });

    const result = await OtpService.sendOtp(phoneNumber, "MOBILE_OTP");
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to send Mobile OTP" });
  }
});

iamRouter.post("/mobile-otp/confirm", async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) return res.status(400).json({ error: "Phone number and code are required" });

    const result = await OtpService.verifyOtp(phoneNumber, code, "MOBILE_OTP");
    if (!result.valid) return res.status(400).json({ error: result.error });

    res.json({ message: "Mobile phone number verified successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Mobile OTP verification failed" });
  }
});

// ── 5. Change Password (With History Prevention & Complexity) ───────────────
iamRouter.post("/change-password", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authUser = (req as any).user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required." });
    }

    const user = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: "User account does not support password change." });
    }

    // Check current password
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    // Check complexity
    const complexityResult = await PasswordPolicyEngine.validateComplexity(newPassword);
    if (!complexityResult.valid) {
      return res.status(400).json({ error: complexityResult.error });
    }

    // Check password history (prevent reuse of past 5 passwords)
    const isReused = await PasswordPolicyEngine.checkHistory(user.id, newPassword, 5);
    if (isReused) {
      return res.status(400).json({ error: "You cannot reuse any of your last 5 passwords." });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await PasswordPolicyEngine.recordPasswordChange(user.id, newHash);

    await auditLog(user.id, user.tenantId, "PASSWORD_CHANGED", "User", user.id, {}, req);

    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// ── 6. Active Sessions & Remote Revocation ──────────────────────────────────
iamRouter.get("/sessions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const sessions = await SessionDeviceService.getActiveSessions(authUser.id);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active sessions" });
  }
});

iamRouter.post("/sessions/revoke", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const authUser = (req as any).user;
    if (!sessionId) return res.status(400).json({ error: "Session ID is required" });

    await SessionDeviceService.revokeSession(sessionId, authUser.id);
    await auditLog(authUser.id, authUser.tenantId, "SESSION_REVOKED", "Session", sessionId, {}, req);

    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

iamRouter.post("/sessions/revoke-all", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    await SessionDeviceService.revokeAllSessionsExcept(authUser.id);
    await auditLog(authUser.id, authUser.tenantId, "ALL_SESSIONS_REVOKED", "User", authUser.id, {}, req);

    res.json({ message: "All other active sessions have been revoked" });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke sessions" });
  }
});

// ── 7. Registered Devices Management ───────────────────────────────────────
iamRouter.get("/devices", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const devices = await SessionDeviceService.getUserDevices(authUser.id);
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch registered devices" });
  }
});

iamRouter.delete("/devices/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = (req as any).user;

    await SessionDeviceService.deleteDevice(id, authUser.id);
    res.json({ message: "Device removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove device" });
  }
});

// ── 8. User Profile & Preferences ─────────────────────────────────────────
iamRouter.get("/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const user = await (prisma as any).user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        phoneVerified: true,
        avatarUrl: true,
        mfaEnabled: true,
        mfaType: true,
        preferredLanguage: true,
        preferredTimezone: true,
        notificationPreferences: true,
        createdAt: true,
      },
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

iamRouter.put("/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { firstName, lastName, phoneNumber, avatarUrl, preferredLanguage, preferredTimezone, notificationPreferences } = req.body;

    const updated = await (prisma as any).user.update({
      where: { id: authUser.id },
      data: {
        firstName,
        lastName,
        phoneNumber,
        avatarUrl,
        preferredLanguage,
        preferredTimezone,
        notificationPreferences: notificationPreferences ? JSON.stringify(notificationPreferences) : undefined,
      },
    });

    res.json({ message: "Profile updated successfully", user: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user profile" });
  }
});
