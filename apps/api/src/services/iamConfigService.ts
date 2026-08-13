import { prisma } from "@saas/database";

export interface AuthProviderInput {
  provider: string; // GOOGLE, MICROSOFT, APPLE, GITHUB, FACEBOOK, LINKEDIN
  isEnabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  callbackUrl?: string;
  scopes?: string[];
  additionalSettings?: Record<string, any>;
  tenantId?: string;
}

export interface SecurityPolicyInput {
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChar: boolean;
  passwordHistoryLimit: number;
  passwordMaxAgeDays: number;
  sessionIdleTimeoutMinutes: number;
  sessionAbsoluteTimeoutHours: number;
  otpLength: number;
  otpExpiryMinutes: number;
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicyInput = {
  maxFailedLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChar: false,
  passwordHistoryLimit: 5,
  passwordMaxAgeDays: 90,
  sessionIdleTimeoutMinutes: 30,
  sessionAbsoluteTimeoutHours: 24,
  otpLength: 6,
  otpExpiryMinutes: 10,
};

export class EnterpriseIamConfigService {
  /**
   * Get all registered Auth Providers from Database (or return defaults)
   */
  static async getProviders() {
    const providers = await (prisma as any).authProviderConfig.findMany({
      orderBy: { provider: "asc" },
    });

    const defaultProviders = [
      "GOOGLE",
      "MICROSOFT",
      "APPLE",
      "GITHUB",
      "FACEBOOK",
      "LINKEDIN",
    ];

    const dbMap = new Map((providers as any[]).map((p: any) => [p.provider, p]));

    return defaultProviders.map((prov) => {
      const existing: any = dbMap.get(prov);
      if (existing) {
        return {
          id: existing.id,
          provider: existing.provider,
          isEnabled: existing.isEnabled,
          clientId: existing.clientId || "",
          clientSecret: existing.clientSecret ? "••••••••••••" : "",
          redirectUri: existing.redirectUri || "",
          callbackUrl: existing.callbackUrl || "",
          scopes: JSON.parse(existing.scopes || "[]"),
          additionalSettings: JSON.parse(existing.additionalSettings || "{}"),
          updatedAt: existing.updatedAt,
        };
      }

      return {
        id: `default-${prov.toLowerCase()}`,
        provider: prov,
        isEnabled: prov === "GOOGLE", // Enable Google by default
        clientId: process.env[`${prov}_CLIENT_ID`] || "",
        clientSecret: process.env[`${prov}_CLIENT_SECRET`] ? "••••••••••••" : "",
        redirectUri: process.env[`${prov}_REDIRECT_URI`] || `http://localhost:3000/auth/${prov.toLowerCase()}/callback`,
        callbackUrl: process.env[`${prov}_CALLBACK_URL`] || `http://localhost:4000/api/v1/auth/${prov.toLowerCase()}/callback`,
        scopes: prov === "GOOGLE" ? ["email", "profile"] : ["basic"],
        additionalSettings: {},
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Save or update an OAuth Provider configuration
   */
  static async upsertProvider(input: AuthProviderInput) {
    const providerKey = input.provider.toUpperCase();
    const scopesJson = JSON.stringify(input.scopes || ["email", "profile"]);
    const additionalJson = JSON.stringify(input.additionalSettings || {});

    const existing = await (prisma as any).authProviderConfig.findUnique({
      where: { provider: providerKey },
    });

    if (existing) {
      return (prisma as any).authProviderConfig.update({
        where: { provider: providerKey },
        data: {
          isEnabled: input.isEnabled,
          clientId: input.clientId !== undefined ? input.clientId : existing.clientId,
          clientSecret:
            input.clientSecret && !input.clientSecret.includes("••••")
              ? input.clientSecret
              : existing.clientSecret,
          redirectUri: input.redirectUri || existing.redirectUri,
          callbackUrl: input.callbackUrl || existing.callbackUrl,
          scopes: scopesJson,
          additionalSettings: additionalJson,
        },
      });
    }

    return (prisma as any).authProviderConfig.create({
      data: {
        provider: providerKey,
        isEnabled: input.isEnabled,
        clientId: input.clientId || "",
        clientSecret: input.clientSecret || "",
        redirectUri: input.redirectUri || "",
        callbackUrl: input.callbackUrl || "",
        scopes: scopesJson,
        additionalSettings: additionalJson,
      },
    });
  }

  /**
   * Get dynamic IAM Security Policy
   */
  static async getSecurityPolicy(): Promise<SecurityPolicyInput> {
    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: "IAM_SECURITY_POLICY" },
      });

      if (setting && setting.value) {
        return { ...DEFAULT_SECURITY_POLICY, ...JSON.parse(setting.value) };
      }
    } catch (e) {
      console.warn("Failed to load IAM policy from DB, using defaults.");
    }
    return DEFAULT_SECURITY_POLICY;
  }

  /**
   * Update dynamic IAM Security Policy
   */
  static async updateSecurityPolicy(policy: Partial<SecurityPolicyInput>) {
    const current = await this.getSecurityPolicy();
    const updated = { ...current, ...policy };

    await prisma.platformSetting.upsert({
      where: { key: "IAM_SECURITY_POLICY" },
      update: { value: JSON.stringify(updated) },
      create: {
        key: "IAM_SECURITY_POLICY",
        value: JSON.stringify(updated),
        description: "Global IAM Security Policy Settings",
      },
    });

    return updated;
  }
}
