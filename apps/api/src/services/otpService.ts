import { prisma } from "@saas/database";

export class OtpService {
  /**
   * Generate numeric OTP string
   */
  static generateOtp(length = 6): string {
    let digits = "";
    for (let i = 0; i < length; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }
    return digits;
  }

  /**
   * Create or update verification OTP token for Email or Mobile SMS
   */
  static async sendOtp(identifier: string, type: "EMAIL_VERIFICATION" | "MOBILE_OTP" | "INVITATION", expiryMinutes = 10) {
    const otp = this.generateOtp(6);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Delete previous pending OTPs for this identifier
    await (prisma as any).verificationToken.deleteMany({
      where: { identifier, type },
    });

    await (prisma as any).verificationToken.create({
      data: {
        identifier,
        token: otp,
        type,
        expiresAt,
      },
    });

    console.info(`[OtpService] Generated OTP for ${identifier} (${type}): ${otp}`);

    return {
      success: true,
      message: `OTP sent successfully to ${identifier}`,
      // Expose OTP in development mode for easy testing
      ...(process.env.NODE_ENV !== "production" && { otp }),
    };
  }

  /**
   * Verify provided OTP token against database
   */
  static async verifyOtp(identifier: string, token: string, type: "EMAIL_VERIFICATION" | "MOBILE_OTP" | "INVITATION") {
    const record = await (prisma as any).verificationToken.findFirst({
      where: {
        identifier,
        type,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      return { valid: false, error: "OTP expired or invalid." };
    }

    if (record.attempts >= 5) {
      await (prisma as any).verificationToken.delete({ where: { id: record.id } });
      return { valid: false, error: "Too many failed attempts. Please request a new OTP." };
    }

    if (record.token !== token.trim()) {
      await (prisma as any).verificationToken.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      return { valid: false, error: "Incorrect OTP code." };
    }

    // Delete token after successful verification
    await (prisma as any).verificationToken.delete({ where: { id: record.id } });

    // Mark email or phone as verified in user profile if matched
    const user = await (prisma as any).user.findFirst({
      where: {
        OR: [{ email: identifier }, { phoneNumber: identifier }],
      },
    });

    if (user) {
      if (type === "EMAIL_VERIFICATION" || identifier.includes("@")) {
        await (prisma as any).user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      } else {
        await (prisma as any).user.update({
          where: { id: user.id },
          data: { phoneVerified: new Date() },
        });
      }
    }

    return { valid: true };
  }
}
