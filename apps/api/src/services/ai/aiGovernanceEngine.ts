import { prisma } from "@saas/database";

export class AiGovernanceEngine {
  /**
   * Scans text for sensitive PII data (SSN, Credit Cards, Emails, Phone Numbers) and masks it.
   */
  public maskSensitiveData(text: string): string {
    let sanitized = text;

    // 1. Social Security Numbers (SSN) -> XXX-XX-XXXX
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[MASKED_SSN]");

    // 2. Credit Card Numbers (13-16 digits)
    sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,16}\b/g, "[MASKED_CREDIT_CARD]");

    // 3. Email Addresses
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (email) => {
      const parts = email.split("@");
      return `${parts[0].substring(0, 2)}***@${parts[1]}`;
    });

    // 4. Phone Numbers (US & International formats)
    sanitized = sanitized.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[MASKED_PHONE]");

    return sanitized;
  }

  /**
   * Validates rate limits and monthly budget caps for a given tenant.
   */
  public async validateRateLimits(tenantId?: string, userId?: string): Promise<boolean> {
    if (!tenantId) return true;

    // Fetch tenant AI configs & governance policies
    const tenantConfigs = await prisma.tenantAiConfig.findMany({
      where: { tenantId },
    });

    for (const config of tenantConfigs) {
      if (!config.isActive) {
        throw new Error("AI access is disabled for this organization.");
      }
      if (config.quotaMonthly > 0 && config.usageCurrent >= config.quotaMonthly) {
        throw new Error(`Monthly AI token quota (${config.quotaMonthly}) exceeded for your tenant.`);
      }
    }

    return true;
  }

  /**
   * Audits prompt content against safety policies.
   */
  public auditPromptSafety(prompt: string): { isSafe: boolean; violationReason?: string } {
    const prohibitedKeywords = ["malware", "exploit", "illegal_bypass", "ransomware_gen"];
    const lower = prompt.toLowerCase();

    for (const word of prohibitedKeywords) {
      if (lower.includes(word)) {
        return {
          isSafe: false,
          violationReason: `Prompt contains forbidden keyword: ${word}`,
        };
      }
    }

    return { isSafe: true };
  }
}

export const aiGovernanceEngine = new AiGovernanceEngine();
