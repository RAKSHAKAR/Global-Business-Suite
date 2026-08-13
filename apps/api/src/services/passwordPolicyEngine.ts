import bcrypt from "bcryptjs";
import { prisma } from "@saas/database";
import { EnterpriseIamConfigService, SecurityPolicyInput } from "./iamConfigService";

export class PasswordPolicyEngine {
  /**
   * Validate password strength against active Security Policy
   */
  static async validateComplexity(password: string, policy?: SecurityPolicyInput) {
    const activePolicy = policy || (await EnterpriseIamConfigService.getSecurityPolicy());

    if (password.length < activePolicy.passwordMinLength) {
      return {
        valid: false,
        error: `Password must be at least ${activePolicy.passwordMinLength} characters long.`,
      };
    }

    if (activePolicy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: "Password must contain at least one uppercase letter (A-Z).",
      };
    }

    if (activePolicy.passwordRequireLowercase && !/[a-z]/.test(password)) {
      return {
        valid: false,
        error: "Password must contain at least one lowercase letter (a-z).",
      };
    }

    if (activePolicy.passwordRequireNumbers && !/[0-9]/.test(password)) {
      return {
        valid: false,
        error: "Password must contain at least one number (0-9).",
      };
    }

    if (activePolicy.passwordRequireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return {
        valid: false,
        error: "Password must contain at least one special character.",
      };
    }

    return { valid: true };
  }

  /**
   * Check if new password matches any of the user's past N passwords (prevent password reuse)
   */
  static async checkHistory(userId: string, newPassword: string, limit = 5): Promise<boolean> {
    const history = await (prisma as any).passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    for (const record of history) {
      const match = await bcrypt.compare(newPassword, record.passwordHash);
      if (match) {
        return true; // Password was used previously
      }
    }

    return false; // Safe to use
  }

  /**
   * Save password to history record
   */
  static async recordPasswordChange(userId: string, passwordHash: string) {
    await (prisma as any).passwordHistory.create({
      data: { userId, passwordHash },
    });

    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        passwordHash,
        lastPasswordChange: new Date(),
        mustChangePassword: false,
      },
    });
  }

  /**
   * Generate temporary strong password
   */
  static generateTemporaryPassword(length = 12): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
