import { prisma } from "@saas/database";

export interface AIAnalyticsSummary {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUSD: number;
  avgLatencyMs: number;
  successRate: number;
  providerBreakdown: { providerKey: string; count: number; cost: number }[];
  modelBreakdown: { modelKey: string; count: number; cost: number }[];
}

export class AiAnalyticsEngine {
  /**
   * Generates comprehensive analytics for AI token consumption, latency, and costs.
   */
  public async getAnalyticsSummary(tenantId?: string): Promise<AIAnalyticsSummary> {
    const usageLogs = await prisma.aiUsageLog.findMany({
      where: tenantId ? { tenantId } : {},
      take: 1000,
      orderBy: { createdAt: "desc" },
    });

    if (usageLogs.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalCostUSD: 0,
        avgLatencyMs: 0,
        successRate: 100,
        providerBreakdown: [],
        modelBreakdown: [],
      };
    }

    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalCostUSD = 0;
    let totalLatency = 0;
    let successCount = 0;

    const providerMap: Record<string, { count: number; cost: number }> = {};
    const modelMap: Record<string, { count: number; cost: number }> = {};

    for (const log of usageLogs) {
      totalTokens += log.totalTokens;
      promptTokens += log.promptTokens;
      completionTokens += log.completionTokens;
      totalCostUSD += log.estimatedCost;
      totalLatency += log.latencyMs;
      if (log.status === "SUCCESS") successCount++;

      // Provider map
      if (!providerMap[log.providerKey]) {
        providerMap[log.providerKey] = { count: 0, cost: 0 };
      }
      providerMap[log.providerKey].count += 1;
      providerMap[log.providerKey].cost += log.estimatedCost;

      // Model map
      if (!modelMap[log.modelKey]) {
        modelMap[log.modelKey] = { count: 0, cost: 0 };
      }
      modelMap[log.modelKey].count += 1;
      modelMap[log.modelKey].cost += log.estimatedCost;
    }

    return {
      totalRequests: usageLogs.length,
      totalTokens,
      promptTokens,
      completionTokens,
      totalCostUSD: Number(totalCostUSD.toFixed(4)),
      avgLatencyMs: Math.round(totalLatency / usageLogs.length),
      successRate: Number(((successCount / usageLogs.length) * 100).toFixed(1)),
      providerBreakdown: Object.entries(providerMap).map(([providerKey, data]) => ({
        providerKey,
        count: data.count,
        cost: Number(data.cost.toFixed(4)),
      })),
      modelBreakdown: Object.entries(modelMap).map(([modelKey, data]) => ({
        modelKey,
        count: data.count,
        cost: Number(data.cost.toFixed(4)),
      })),
    };
  }
}

export const aiAnalyticsEngine = new AiAnalyticsEngine();
