import { prisma } from "@saas/database";

export interface CreateMonitorPayload {
  tenantId: string;
  name: string;
  keywords: string[];
  competitors: string[];
}

export class SocialListeningService {
  /**
   * Create or update a social listening monitor
   */
  static async createMonitor(payload: CreateMonitorPayload) {
    return prisma.socialListeningMonitor.create({
      data: {
        tenantId: payload.tenantId,
        name: payload.name,
        keywordsJson: JSON.stringify(payload.keywords || []),
        competitorsJson: JSON.stringify(payload.competitors || []),
      },
    });
  }

  /**
   * Fetch monitors for a tenant with mention counts and sentiment breakdown
   */
  static async getMonitors(tenantId: string) {
    const monitors = await prisma.socialListeningMonitor.findMany({
      where: { tenantId },
      include: {
        mentions: { orderBy: { createdAt: "desc" }, take: 50 },
        competitors: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return monitors.map((m) => {
      const positive = m.mentions.filter((x) => (x.sentimentScore || 0) > 0.2).length;
      const negative = m.mentions.filter((x) => (x.sentimentScore || 0) < -0.2).length;
      const neutral = m.mentions.length - positive - negative;
      const avgSentiment = m.mentions.length > 0
        ? m.mentions.reduce((acc, curr) => acc + (curr.sentimentScore || 0), 0) / m.mentions.length
        : 0;

      return {
        ...m,
        keywords: JSON.parse(m.keywordsJson || "[]"),
        competitorsList: JSON.parse(m.competitorsJson || "[]"),
        sentimentSummary: { positive, negative, neutral, avgSentiment },
      };
    });
  }

  /**
   * Process simulated / live social web mention
   */
  static async recordMention(payload: {
    monitorId: string;
    tenantId: string;
    platform: string;
    externalId?: string;
    authorName: string;
    content: string;
    url?: string;
  }) {
    const sentimentScore = this.calculateSentimentScore(payload.content);
    return prisma.socialMention.create({
      data: {
        monitorId: payload.monitorId,
        tenantId: payload.tenantId,
        platform: payload.platform,
        externalId: payload.externalId || `ext_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        authorName: payload.authorName,
        content: payload.content,
        url: payload.url,
        sentimentScore,
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Compute sentiment score (-1 to +1)
   */
  private static calculateSentimentScore(text: string): number {
    const positiveWords = ["awesome", "gamechanger", "best", "love", "impressive", "innovative", "top", "recommend"];
    const negativeWords = ["broken", "terrible", "crash", "scam", "overpriced", "slow", "fail", "useless"];
    const lower = text.toLowerCase();

    let score = 0;
    positiveWords.forEach((w) => { if (lower.includes(w)) score += 0.3; });
    negativeWords.forEach((w) => { if (lower.includes(w)) score -= 0.3; });

    return Math.max(-1.0, Math.min(1.0, score));
  }
}
