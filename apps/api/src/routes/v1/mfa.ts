import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { MfaService } from "../../services/mfaService";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

// POST /api/v1/auth/mfa/setup - Initialize TOTP Secret & Recovery Codes
router.post("/setup", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId =
      (req as any).user?.userId ||
      (req as any).user?.id ||
      (req as any).user?.sub;
    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: (req as any).user?.email },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const secret = MfaService.generateSecret();
    const otpAuthUri = MfaService.generateOtpAuthUri(user.email, secret);
    const recoveryCodes = MfaService.generateRecoveryCodes();

    res.json({
      secret,
      otpAuthUri,
      recoveryCodes,
      message:
        "Scan the QR code in Google Authenticator or Authy, then verify with a 6-digit passcode.",
    });
  } catch (error) {
    console.error("[mfa:setup]", error);
    res.status(500).json({ error: "Failed to generate MFA setup keys" });
  }
});

// POST /api/v1/auth/mfa/verify - Enable MFA after passcode verification
router.post("/verify", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId || (req as any).user.id;
    const { passcode, secret, recoveryCodes } = req.body;

    if (!passcode || !secret) {
      return res
        .status(400)
        .json({ error: "Passcode and secret are required" });
    }

    const isValid = MfaService.verifyTotp(passcode, secret);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid 6-digit TOTP passcode" });
    }

    // Save MFA secret and update User
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
      } as any,
    });

    // Record Audit Log
    await prisma.auditLog
      .create({
        data: {
          userId,
          action: "MFA_ENABLED",
          resource: "User",
          resourceId: userId,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
      })
      .catch(() => {});

    res.json({
      success: true,
      message: "Multi-Factor Authentication (MFA) enabled successfully!",
    });
  } catch (error) {
    console.error("[mfa:verify]", error);
    res.status(500).json({ error: "Failed to verify MFA passcode" });
  }
});

// POST /api/v1/auth/mfa/validate - Validate passcode during login flow
router.post("/validate", async (req: Request, res: Response) => {
  try {
    const { userId, passcode } = req.body;

    if (!userId || !passcode) {
      return res
        .status(400)
        .json({ error: "UserId and passcode are required" });
    }

    const user: any = await prisma.user.findUnique({ where: { id: userId } });
    const userSecret = user?.twoFactorSecret || user?.mfaSecret;
    if (!user || !userSecret) {
      return res.status(400).json({ error: "MFA not configured for user" });
    }

    const isValid = MfaService.verifyTotp(passcode, userSecret);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid MFA passcode" });
    }

    res.json({ success: true, message: "MFA validation successful" });
  } catch (error) {
    console.error("[mfa:validate]", error);
    res.status(500).json({ error: "MFA validation error" });
  }
});

export default router;
