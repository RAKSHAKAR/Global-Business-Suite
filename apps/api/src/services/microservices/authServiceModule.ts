import { prisma } from "@saas/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { EnterpriseCaptchaService } from "../captchaService";
import { eventBus } from "../eventBus";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";

export class AuthServiceModule {
  public async generateCaptcha() {
    return EnterpriseCaptchaService.generateCaptcha();
  }

  public async authenticateUser(credentials: { email: string; password?: string; captchaToken?: string; captchaInput?: string }) {
    if (credentials.captchaToken && credentials.captchaInput) {
      const captchaResult = EnterpriseCaptchaService.verifyCaptcha(credentials.captchaToken, credentials.captchaInput);
      if (!captchaResult.success) {
        throw new Error(captchaResult.error || "Invalid CAPTCHA solution");
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: { tenant: true, roles: { include: { role: true } } },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    if (credentials.password) {
      const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash || "");
      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }
    }

    const userRole = user.roles?.[0]?.role?.name || "USER";
    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: userRole,
        tenantId: user.tenantId,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    eventBus.publish("auth:login", { userId: user.id, email: user.email }, { tenantId: user.tenantId || undefined, userId: user.id });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: userName,
        role: userRole,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name,
      },
    };
  }

  public async verifyToken(token: string) {
    return jwt.verify(token, JWT_SECRET);
  }
}

export const authServiceModule = new AuthServiceModule();
