import { prisma } from "@saas/database";

export interface FeatureFlagRule {
  tenants?: string[];
  plans?: string[];
  roles?: string[];
  users?: string[];
}

export class FeatureFlagService {
  /**
   * Get all registered feature flags
   */
  static async getFlags() {
    const flags = await (prisma as any).featureFlag.findMany({
      orderBy: { key: "asc" },
    });
    return flags.map((f: any) => ({
      ...f,
      targetRules: JSON.parse(f.targetRules || "{}"),
    }));
  }

  /**
   * Evaluate whether a specific feature flag is enabled for a given context
   */
  static async isEnabled(
    flagKey: string,
    context?: { tenantId?: string; planId?: string; roleName?: string; userId?: string },
  ): Promise<boolean> {
    try {
      const flag = await (prisma as any).featureFlag.findUnique({
        where: { key: flagKey.toUpperCase() },
      });

      if (!flag) return true; // Default enabled if flag is not registered
      if (!flag.isEnabled) return false;

      const rules: FeatureFlagRule = JSON.parse(flag.targetRules || "{}");

      // Check tenant targeting
      if (rules.tenants && rules.tenants.length > 0 && context?.tenantId) {
        if (!rules.tenants.includes(context.tenantId)) return false;
      }

      // Check plan targeting
      if (rules.plans && rules.plans.length > 0 && context?.planId) {
        if (!rules.plans.includes(context.planId)) return false;
      }

      // Check role targeting
      if (rules.roles && rules.roles.length > 0 && context?.roleName) {
        if (!rules.roles.includes(context.roleName)) return false;
      }

      // Check user targeting
      if (rules.users && rules.users.length > 0 && context?.userId) {
        if (!rules.users.includes(context.userId)) return false;
      }

      return true;
    } catch (e) {
      console.warn(`[FeatureFlag] Evaluation error for key ${flagKey}:`, e);
      return true;
    }
  }

  /**
   * Upsert feature flag
   */
  static async upsertFlag(data: {
    key: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    targetRules?: FeatureFlagRule;
  }) {
    const key = data.key.toUpperCase();
    const targetRulesJson = JSON.stringify(data.targetRules || {});

    return (prisma as any).featureFlag.upsert({
      where: { key },
      update: {
        name: data.name,
        description: data.description,
        isEnabled: data.isEnabled,
        targetRules: targetRulesJson,
      },
      create: {
        key,
        name: data.name,
        description: data.description,
        isEnabled: data.isEnabled,
        targetRules: targetRulesJson,
      },
    });
  }
}
