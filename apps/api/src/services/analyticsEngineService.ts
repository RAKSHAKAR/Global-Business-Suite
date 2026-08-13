import { prisma } from "@saas/database";

type AvailabilityStatus = "AVAILABLE" | "NO_DATA";

export interface DashboardMetricsResult {
  dashboardKey: string;
  title: string;
  summaryMetrics: Record<string, unknown>;
  kpis: Array<{
    key: string;
    name: string;
    value: number;
    unit?: string;
    changePercent: number | null;
    status: AvailabilityStatus;
  }>;
  chartData: Record<string, unknown>;
  aiStrategicInsights: string[];
  lastRefreshedAt: string;
  dataSource: "DATABASE";
}

export class AnalyticsServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AnalyticsServiceError";
  }
}

const safeJsonArray = (value: string | null | undefined): unknown[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const percentChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const reportWhere = (reportId: string, tenantId?: string) => ({
  id: reportId,
  ...(tenantId
    ? { OR: [{ tenantId }, { isSystemReport: true }] }
    : {}),
});

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date
    ? value.toISOString()
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export class AnalyticsEngineService {
  /** Fetch tenant-scoped metrics using persisted records only. */
  static async getDomainDashboard(
    dashboardKey: string,
    tenantId?: string,
  ): Promise<DashboardMetricsResult> {
    try {
      const uppercaseKey = dashboardKey.toUpperCase();
      const tenantFilter = tenantId ? { tenantId } : {};
      const now = new Date();
      const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const chartPeriodStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const [
        totalUsers,
        totalTenants,
        totalSubscriptions,
        activeSubscriptions,
        totalInvoices,
        paidInvoices,
        totalRevenueAgg,
        currentRevenueAgg,
        previousRevenueAgg,
        paidInvoiceRows,
        totalReviews,
        avgReviewRating,
        totalSocialPosts,
        publishedPosts,
        totalLeads,
        convertedLeads,
        leadStatuses,
        totalOpportunities,
        wonOpportunities,
        totalAiUsage,
        totalAiCost,
        aiUsageByProvider,
        totalTickets,
        openTickets,
        totalAuditLogs,
        totalSystemLogs,
        activeChannels,
      ] = await Promise.all([
        prisma.user.count({ where: tenantFilter }),
        prisma.tenant.count({ where: tenantId ? { id: tenantId } : {} }),
        prisma.subscription.count({ where: tenantFilter }),
        prisma.subscription.count({ where: { ...tenantFilter, status: "ACTIVE" } }),
        prisma.invoice.count({ where: tenantFilter }),
        prisma.invoice.count({ where: { ...tenantFilter, status: "PAID" } }),
        prisma.invoice.aggregate({
          where: { ...tenantFilter, status: "PAID", currency: "USD" },
          _sum: { amount: true },
        }),
        prisma.invoice.aggregate({
          where: {
            ...tenantFilter,
            status: "PAID",
            currency: "USD",
            paidAt: { gte: currentPeriodStart },
          },
          _sum: { amount: true },
        }),
        prisma.invoice.aggregate({
          where: {
            ...tenantFilter,
            status: "PAID",
            currency: "USD",
            paidAt: { gte: previousPeriodStart, lt: currentPeriodStart },
          },
          _sum: { amount: true },
        }),
        prisma.invoice.findMany({
          where: {
            ...tenantFilter,
            status: "PAID",
            currency: "USD",
            paidAt: { gte: chartPeriodStart },
          },
          select: { amount: true, paidAt: true },
        }),
        prisma.review.count({ where: tenantFilter }),
        prisma.review.aggregate({ where: tenantFilter, _avg: { starRating: true } }),
        prisma.socialPost.count({ where: tenantFilter }),
        prisma.socialPost.count({ where: { ...tenantFilter, status: "PUBLISHED" } }),
        prisma.crmLead.count({ where: tenantFilter }),
        prisma.crmLead.count({ where: { ...tenantFilter, status: "CONVERTED" } }),
        prisma.crmLead.groupBy({
          by: ["status"],
          where: tenantFilter,
          _count: { _all: true },
        }),
        prisma.crmOpportunity.count({ where: tenantFilter }),
        prisma.crmOpportunity.count({ where: { ...tenantFilter, status: "WON" } }),
        prisma.aiUsageLog.count({ where: tenantFilter }),
        prisma.aiUsageLog.aggregate({ where: tenantFilter, _sum: { estimatedCost: true } }),
        prisma.aiUsageLog.groupBy({
          by: ["providerKey"],
          where: tenantFilter,
          _sum: { totalTokens: true, estimatedCost: true },
        }),
        prisma.ticket.count({ where: tenantFilter }),
        prisma.ticket.count({ where: { ...tenantFilter, status: "OPEN" } }),
        prisma.auditLog.count({ where: tenantFilter }),
        tenantId ? Promise.resolve(0) : prisma.systemLog.count(),
        prisma.socialChannel.count({ where: { ...tenantFilter, isActive: true } }),
      ]);

      const totalRevenue = totalRevenueAgg._sum.amount ?? 0;
      const currentRevenue = currentRevenueAgg._sum.amount ?? 0;
      const previousRevenue = previousRevenueAgg._sum.amount ?? 0;
      const avgRating = Math.round((avgReviewRating._avg.starRating ?? 0) * 10) / 10;
      const leadConversionRate = totalLeads > 0
        ? Math.round((convertedLeads / totalLeads) * 1000) / 10
        : 0;
      const winRate = totalOpportunities > 0
        ? Math.round((wonOpportunities / totalOpportunities) * 1000) / 10
        : 0;
      const totalCostUSD = Math.round((totalAiCost._sum.estimatedCost ?? 0) * 100) / 100;

      const revenueByMonth = new Map<string, number>();
      for (let offset = 5; offset >= 0; offset -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
        revenueByMonth.set(monthKey(date), 0);
      }
      for (const invoice of paidInvoiceRows) {
        if (!invoice.paidAt) continue;
        const key = monthKey(invoice.paidAt);
        if (revenueByMonth.has(key)) {
          revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + invoice.amount);
        }
      }

      const leadCounts = Object.fromEntries(
        leadStatuses.map((entry) => [entry.status, entry._count._all]),
      ) as Record<string, number>;

      const dataInsights = [
        totalLeads > 0
          ? `${convertedLeads} of ${totalLeads} recorded CRM leads are converted (${leadConversionRate}%).`
          : "No CRM leads are recorded for this scope.",
        totalReviews > 0
          ? `${totalReviews} reviews are recorded with an average rating of ${avgRating}.`
          : "No review data is recorded for this scope.",
        totalAiUsage > 0
          ? `${totalAiUsage} AI usage events are recorded with $${totalCostUSD.toFixed(2)} in logged estimated cost.`
          : "No AI usage events are recorded for this scope.",
      ];

      return {
        dashboardKey: uppercaseKey,
        title: `${uppercaseKey.replace(/_/g, " ")} DASHBOARD`,
        summaryMetrics: {
          totalUsers,
          totalTenants,
          totalSubscriptions,
          activeSubscriptions,
          totalInvoices,
          paidInvoices,
          totalPaidRevenueUSD: totalRevenue,
          paidRevenueLast30DaysUSD: currentRevenue,
          annualizedCurrentRevenueUSD: currentRevenue * 12,
          totalReviews,
          avgRating,
          totalSocialPosts,
          publishedPosts,
          totalLeads,
          leadConversionRatePercent: leadConversionRate,
          totalOpportunities,
          winRatePercent: winRate,
          aiUsageEvents: totalAiUsage,
          aiEstimatedCostUSD: totalCostUSD,
          totalTickets,
          openTicketsCount: openTickets,
          auditLogCount: totalAuditLogs,
          systemLogCount: tenantId ? null : totalSystemLogs,
          connectedChannels: activeChannels,
          systemHealthStatus: "NOT_MEASURED",
          slaPerformancePercent: null,
        },
        kpis: [
          {
            key: "REVENUE_LAST_30_DAYS",
            name: "Paid revenue (last 30 days)",
            value: currentRevenue,
            unit: "USD",
            changePercent: percentChange(currentRevenue, previousRevenue),
            status: currentRevenue > 0 ? "AVAILABLE" : "NO_DATA",
          },
          {
            key: "ACTIVE_SUBSCRIPTIONS",
            name: "Active subscriptions",
            value: activeSubscriptions,
            changePercent: null,
            status: totalSubscriptions > 0 ? "AVAILABLE" : "NO_DATA",
          },
          {
            key: "LEAD_CONVERSION",
            name: "Lead conversion rate",
            value: leadConversionRate,
            unit: "%",
            changePercent: null,
            status: totalLeads > 0 ? "AVAILABLE" : "NO_DATA",
          },
          {
            key: "GBP_RATING",
            name: "Recorded review rating",
            value: avgRating,
            unit: "Stars",
            changePercent: null,
            status: totalReviews > 0 ? "AVAILABLE" : "NO_DATA",
          },
          {
            key: "OPEN_SUPPORT_TICKETS",
            name: "Open support tickets",
            value: openTickets,
            changePercent: null,
            status: totalTickets > 0 ? "AVAILABLE" : "NO_DATA",
          },
        ],
        chartData: {
          revenueTrend: Array.from(revenueByMonth.entries()).map(([month, revenue]) => ({
            month,
            revenue: Math.round(revenue * 100) / 100,
          })),
          leadFunnel: [
            { stage: "All leads", count: totalLeads },
            { stage: "Contacted", count: leadCounts.CONTACTED ?? 0 },
            { stage: "Qualified", count: leadCounts.QUALIFIED ?? 0 },
            { stage: "Converted", count: leadCounts.CONVERTED ?? 0 },
          ],
          aiUsageByProvider: aiUsageByProvider.map((provider) => ({
            provider: provider.providerKey,
            tokens: provider._sum.totalTokens ?? 0,
            cost: provider._sum.estimatedCost ?? 0,
          })),
        },
        aiStrategicInsights: dataInsights,
        lastRefreshedAt: now.toISOString(),
        dataSource: "DATABASE",
      };
    } catch (error) {
      console.error("[analytics:getDomainDashboard]", error);
      throw error;
    }
  }

  /** Executive scorecards derived from persisted tenant data. */
  static async getExecutiveScorecard(
    scorecardType: "OWNER" | "PARTNER" | "CUSTOMER",
    tenantId?: string,
  ) {
    try {
      const tenantFilter = tenantId ? { tenantId } : {};
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      if (scorecardType === "OWNER") {
        const [activeTenants, activeUsers, revenue, aiCost] = await Promise.all([
          prisma.tenant.count({ where: tenantId ? { id: tenantId, isActive: true } : { isActive: true } }),
          prisma.user.count({ where: { ...tenantFilter, isActive: true } }),
          prisma.invoice.aggregate({
            where: { ...tenantFilter, status: "PAID", currency: "USD", paidAt: { gte: last30Days } },
            _sum: { amount: true },
          }),
          prisma.aiUsageLog.aggregate({ where: tenantFilter, _sum: { estimatedCost: true } }),
        ]);
        const monthlyRevenue = revenue._sum.amount ?? 0;
        return {
          title: "Platform owner scorecard",
          paidRevenueLast30DaysUSD: monthlyRevenue,
          annualizedCurrentRevenueUSD: monthlyRevenue * 12,
          activeTenants,
          activeUsers,
          loggedAiEstimatedCostUSD: aiCost._sum.estimatedCost ?? 0,
          netRevenueRetentionPercent: null,
          platformUptimePercent: null,
          customerAcquisitionCostUSD: null,
          customerLifetimeValueUSD: null,
          scorecardGrade: null,
          dataSource: "DATABASE",
        };
      }

      if (scorecardType === "PARTNER") {
        const [totalClients, activeClients, activeCampaigns, rating, reviews, monthlyLeads] = await Promise.all([
          prisma.client.count({ where: tenantFilter }),
          prisma.client.count({ where: { ...tenantFilter, status: "ACTIVE" } }),
          prisma.marketingCampaign.count({ where: { ...tenantFilter, status: "ACTIVE" } }),
          prisma.review.aggregate({ where: tenantFilter, _avg: { starRating: true } }),
          prisma.review.count({ where: tenantFilter }),
          prisma.crmLead.count({ where: { ...tenantFilter, createdAt: { gte: last30Days } } }),
        ]);
        return {
          title: "Partner operations scorecard",
          managedClients: totalClients,
          activeClients,
          activeCampaigns,
          googleBusinessRating: rating._avg.starRating ?? null,
          recordedReviews: reviews,
          monthlyLeadsGenerated: monthlyLeads,
          clientRetentionPercent: totalClients > 0
            ? Math.round((activeClients / totalClients) * 1000) / 10
            : null,
          socialMediaReach: null,
          aiTimeSavedHoursMonthly: null,
          scorecardGrade: null,
          dataSource: "DATABASE",
        };
      }

      const [orders, completedAppointments, activeSubscriptions, outstanding, rating] = await Promise.all([
        prisma.customerOrder.count({ where: tenantFilter }),
        prisma.customerAppointment.count({ where: { ...tenantFilter, status: "COMPLETED" } }),
        prisma.subscription.count({ where: { ...tenantFilter, status: "ACTIVE" } }),
        prisma.invoice.aggregate({
          where: { ...tenantFilter, status: "OPEN", currency: "USD" },
          _sum: { amount: true },
        }),
        prisma.review.aggregate({ where: tenantFilter, _avg: { starRating: true } }),
      ]);
      return {
        title: "Customer activity scorecard",
        totalOrdersCount: orders,
        completedAppointmentsCount: completedAppointments,
        activeServicesCount: activeSubscriptions,
        outstandingInvoicesUSD: outstanding._sum.amount ?? 0,
        satisfactionScore: rating._avg.starRating ?? null,
        loyaltyTier: null,
        loyaltyPoints: null,
        scorecardGrade: null,
        dataSource: "DATABASE",
      };
    } catch (error) {
      console.error("[analytics:getExecutiveScorecard]", error);
      throw error;
    }
  }

  /** Return a persisted model snapshot. No forecast is invented when none exists. */
  static async getPredictiveForecast(modelType: string, tenantId?: string) {
    try {
      const uppercaseModel = modelType.toUpperCase();
      const snapshot = await prisma.predictiveModelSnapshot.findFirst({
        where: {
          modelType: uppercaseModel,
          ...(tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      if (!snapshot) {
        throw new AnalyticsServiceError(
          `No persisted ${uppercaseModel} forecast is available for this tenant.`,
          503,
          "FORECAST_NOT_AVAILABLE",
        );
      }
      return {
        id: snapshot.id,
        modelType: snapshot.modelType,
        forecastDays: snapshot.forecastDays,
        accuracyScore: snapshot.accuracyScore,
        confidenceInterval: snapshot.confidenceInterval,
        forecastData: safeJsonArray(snapshot.forecastDataJson),
        contributingFactors: safeJsonArray(snapshot.contributingFactorsJson),
        createdAt: snapshot.createdAt,
        dataSource: "DATABASE",
      };
    } catch (error) {
      if (!(error instanceof AnalyticsServiceError)) {
        console.error("[analytics:getPredictiveForecast]", error);
      }
      throw error;
    }
  }

  /** Explain a trend from persisted KPI history without claiming AI generation. */
  static async explainTrendWithAi(metricKey: string, _trendData: unknown, tenantId?: string) {
    try {
      const kpi = await prisma.kpiDefinition.findFirst({
        where: {
          key: metricKey.toUpperCase(),
          ...(tenantId ? { OR: [{ tenantId }, { isSystem: true }] } : {}),
        },
      });
      if (!kpi) {
        throw new AnalyticsServiceError(
          `No KPI definition exists for ${metricKey}.`,
          503,
          "KPI_HISTORY_NOT_AVAILABLE",
        );
      }
      const history = await prisma.kpiHistory.findMany({
        where: { kpiId: kpi.id, ...(tenantId ? { tenantId } : {}) },
        orderBy: { date: "desc" },
        take: 2,
      });
      if (history.length < 2) {
        throw new AnalyticsServiceError(
          `At least two persisted KPI snapshots are required to explain ${metricKey}.`,
          503,
          "KPI_HISTORY_NOT_AVAILABLE",
        );
      }
      const [current, previous] = history;
      const change = percentChange(current.value, previous.value);
      return {
        metricKey: kpi.key,
        currentValue: current.value,
        previousValue: previous.value,
        changePercent: change,
        hasAnomaly: change !== null && Math.abs(change) >= 20,
        explanation: `${kpi.name} changed from ${previous.value} to ${current.value}${change === null ? "" : ` (${change}%)`} between the two latest recorded snapshots.`,
        recommendedActions: [],
        confidenceScore: null,
        analysisSource: "DATABASE_RULE_BASED",
      };
    } catch (error) {
      if (!(error instanceof AnalyticsServiceError)) {
        console.error("[analytics:explainTrend]", error);
      }
      throw error;
    }
  }

  /** Execute a safe, category-backed report against tenant-scoped models. */
  static async executeReportQuery(reportId: string, tenantId?: string, params?: { limit?: number }) {
    const report = await prisma.reportDefinition.findFirst({ where: reportWhere(reportId, tenantId) });
    if (!report) {
      throw new AnalyticsServiceError("Report not found for this tenant.", 404, "REPORT_NOT_FOUND");
    }
    if (report.sqlQuery) {
      throw new AnalyticsServiceError(
        "Stored SQL report execution is disabled until a tenant-safe query runner is configured.",
        501,
        "CUSTOM_SQL_NOT_IMPLEMENTED",
      );
    }

    const startTime = Date.now();
    const limit = Math.min(Math.max(Number(params?.limit) || 250, 1), 1000);
    const tenantFilter = tenantId ? { tenantId } : {};
    let rows: Array<Record<string, unknown>> = [];

    try {
      switch (report.category.toUpperCase()) {
        case "USERS":
        case "PARTNERS":
        case "CUSTOMERS":
        case "ORGANIZATIONS":
          rows = await prisma.user.findMany({
            where: tenantFilter,
            select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "SUBSCRIPTIONS":
          rows = await prisma.subscription.findMany({
            where: tenantFilter,
            select: { id: true, planId: true, status: true, billingCycle: true, currentPeriodStart: true, currentPeriodEnd: true, createdAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "REVENUE":
        case "FINANCE":
        case "INVOICES":
        case "PAYMENTS":
          rows = await prisma.invoice.findMany({
            where: tenantFilter,
            select: { id: true, invoiceNumber: true, status: true, amount: true, currency: true, paidAt: true, dueDate: true, createdAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "CRM":
        case "LEADS":
        case "SALES":
          rows = await prisma.crmLead.findMany({
            where: tenantFilter,
            select: { id: true, source: true, status: true, score: true, firstName: true, lastName: true, email: true, companyName: true, createdAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "GBP":
        case "REVIEWS":
          rows = await prisma.review.findMany({
            where: tenantFilter,
            select: { id: true, locationId: true, reviewerName: true, starRating: true, replyStatus: true, createTime: true, createdAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "SOCIAL":
        case "MARKETING":
          rows = await prisma.socialPost.findMany({
            where: tenantFilter,
            select: { id: true, platform: true, platforms: true, status: true, approvalStatus: true, scheduledAt: true, publishedAt: true, createdAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "SUPPORT":
          rows = await prisma.ticket.findMany({
            where: tenantFilter,
            select: { id: true, subject: true, status: true, priority: true, createdAt: true, updatedAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "AI":
          rows = await prisma.aiUsageLog.findMany({
            where: tenantFilter,
            select: { id: true, providerKey: true, modelKey: true, totalTokens: true, estimatedCost: true, latencyMs: true, status: true, createdAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        case "AUDIT":
        case "SECURITY":
          rows = await prisma.auditLog.findMany({
            where: tenantFilter,
            select: { id: true, userId: true, action: true, resource: true, resourceId: true, ipAddress: true, createdAt: true },
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          break;
        default:
          throw new AnalyticsServiceError(
            `Report category ${report.category} does not have a tenant-safe data adapter.`,
            501,
            "REPORT_CATEGORY_NOT_IMPLEMENTED",
          );
      }

      const durationMs = Date.now() - startTime;
      const columns = rows.length > 0 ? Object.keys(rows[0]) : safeJsonArray(report.columnsJson).map(String);
      await prisma.reportExecutionLog.create({
        data: {
          reportId,
          tenantId: tenantId || null,
          executionType: "MANUAL",
          exportFormat: "JSON",
          durationMs,
          rowCount: rows.length,
          status: "SUCCESS",
        },
      });
      return {
        reportId: report.id,
        title: report.title,
        reportType: report.reportType,
        chartType: report.chartType,
        columns,
        rows,
        totalRows: rows.length,
        durationMs,
        dataSource: "DATABASE",
      };
    } catch (error) {
      await prisma.reportExecutionLog.create({
        data: {
          reportId,
          tenantId: tenantId || null,
          executionType: "MANUAL",
          exportFormat: "JSON",
          durationMs: Date.now() - startTime,
          rowCount: 0,
          status: "ERROR",
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown report error",
        },
      }).catch(() => undefined);
      console.error("[analytics:executeReportQuery]", error);
      throw error;
    }
  }

  /** Custom SQL is deliberately unavailable until a tenant-safe query compiler exists. */
  static async executeCustomSql(sqlQuery: string, _tenantId?: string): Promise<never> {
    const normalized = String(sqlQuery || "").trim().toUpperCase();
    const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "EXEC", "GRANT"];
    if ((!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) || forbidden.some((keyword) => normalized.includes(keyword))) {
      throw new AnalyticsServiceError(
        "Security Violation: only read-only SELECT or WITH statements are eligible for validation.",
        400,
        "UNSAFE_SQL_REJECTED",
      );
    }
    throw new AnalyticsServiceError(
      "Custom SQL execution is disabled until a tenant-safe query compiler is configured.",
      501,
      "CUSTOM_SQL_NOT_IMPLEMENTED",
    );
  }

  /** Export an actually executed report as CSV or JSON. */
  static async exportReportData(
    reportId: string,
    format: "PDF" | "EXCEL" | "CSV" | "JSON" | "PRINT",
    tenantId?: string,
  ) {
    const normalizedFormat = String(format).toUpperCase();
    if (normalizedFormat !== "CSV" && normalizedFormat !== "JSON") {
      throw new AnalyticsServiceError(
        `${normalizedFormat} export is not implemented. Use CSV or JSON.`,
        501,
        "EXPORT_FORMAT_NOT_IMPLEMENTED",
      );
    }

    const reportData = await this.executeReportQuery(reportId, tenantId);
    if (normalizedFormat === "CSV") {
      const header = reportData.columns.map(csvCell).join(",");
      const body = reportData.rows
        .map((row) => reportData.columns.map((column) => csvCell(row[column])).join(","))
        .join("\n");
      return {
        format: "CSV" as const,
        mimeType: "text/csv;charset=utf-8",
        fileName: `GBS_Report_${reportId}.csv`,
        payload: `${header}${body ? `\n${body}` : ""}`,
        rowCount: reportData.totalRows,
      };
    }
    return {
      format: "JSON" as const,
      mimeType: "application/json",
      fileName: `GBS_Report_${reportId}.json`,
      payload: JSON.stringify(reportData, null, 2),
      rowCount: reportData.totalRows,
    };
  }

  /** Deliver through a configured provider webhook and report only its real outcome. */
  static async deliverScheduledReport(
    reportId: string,
    channels: string[],
    recipients: string[],
    tenantId?: string,
  ) {
    const webhookUrl = process.env.ANALYTICS_REPORT_DELIVERY_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      throw new AnalyticsServiceError(
        "Report delivery is not configured. Set ANALYTICS_REPORT_DELIVERY_WEBHOOK_URL.",
        503,
        "REPORT_DELIVERY_NOT_CONFIGURED",
      );
    }
    if (!Array.isArray(channels) || channels.length === 0 || !Array.isArray(recipients) || recipients.length === 0) {
      throw new AnalyticsServiceError("At least one channel and recipient are required.", 400, "INVALID_DELIVERY_REQUEST");
    }

    const report = await this.exportReportData(reportId, "JSON", tenantId);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, tenantId, channels, recipients, report }),
    });
    if (!response.ok) {
      throw new AnalyticsServiceError(
        `Report delivery provider returned HTTP ${response.status}.`,
        502,
        "REPORT_DELIVERY_PROVIDER_ERROR",
      );
    }
    return {
      reportId,
      deliveredChannels: channels,
      recipientCount: recipients.length,
      status: "DELIVERED",
      deliveredAt: new Date().toISOString(),
      providerStatus: response.status,
    };
  }

  /** Return only rules that have a persisted trigger timestamp. */
  static async processBiAlerts(tenantId?: string) {
    const rules = await prisma.bIAlertRule.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        isActive: true,
        lastTriggeredAt: { not: null },
      },
    });
    const alerts = rules.map((rule) => ({
      ruleId: rule.id,
      name: rule.name,
      metricKey: rule.metricKey,
      severity: rule.severity,
      lastTriggeredAt: rule.lastTriggeredAt,
      triggerCount: rule.triggerCount,
      channels: safeJsonArray(rule.channelsJson),
    }));
    return { activeAlertsCount: alerts.length, alerts, timestamp: new Date().toISOString(), dataSource: "DATABASE" };
  }

  /** List persisted integrations only; secrets and connection URLs are not exposed. */
  static async listBiIntegrations(tenantId?: string) {
    return prisma.biIntegration.findMany({
      where: tenantId ? { tenantId } : {},
      select: {
        id: true,
        name: true,
        platformType: true,
        syncFrequency: true,
        lastSyncAt: true,
        status: true,
        recordsExported: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Create a disabled integration record; activation requires a successful provider sync. */
  static async createBiIntegration(data: {
    tenantId?: string;
    name: string;
    platformType: string;
    connectionUrl?: string;
    syncFrequency?: string;
  }) {
    if (!data.name?.trim() || !data.platformType?.trim()) {
      throw new AnalyticsServiceError("Name and platformType are required.", 400, "INVALID_BI_INTEGRATION");
    }
    return prisma.biIntegration.create({
      data: {
        tenantId: data.tenantId || null,
        name: data.name.trim(),
        platformType: data.platformType.toUpperCase(),
        connectionUrl: data.connectionUrl?.trim() || null,
        apiKeyMasked: null,
        syncFrequency: data.syncFrequency?.toUpperCase() || "MANUAL",
        status: "INACTIVE",
      },
      select: {
        id: true,
        name: true,
        platformType: true,
        syncFrequency: true,
        lastSyncAt: true,
        status: true,
        recordsExported: true,
        createdAt: true,
      },
    });
  }

  /** Trigger a configured sync provider and persist its actual response. */
  static async triggerBiWarehouseSync(integrationId: string, tenantId?: string) {
    const integration = await prisma.biIntegration.findFirst({
      where: { id: integrationId, ...(tenantId ? { tenantId } : {}) },
    });
    if (!integration) {
      throw new AnalyticsServiceError("BI integration not found for this tenant.", 404, "BI_INTEGRATION_NOT_FOUND");
    }
    const webhookUrl = process.env.BI_SYNC_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      throw new AnalyticsServiceError(
        "BI synchronization is not configured. Set BI_SYNC_WEBHOOK_URL.",
        503,
        "BI_SYNC_NOT_CONFIGURED",
      );
    }

    await prisma.biIntegration.update({ where: { id: integration.id }, data: { status: "SYNCING" } });
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: integration.id,
          tenantId: integration.tenantId,
          platformType: integration.platformType,
          connectionUrl: integration.connectionUrl,
          syncConfigJson: integration.syncConfigJson,
        }),
      });
      if (!response.ok) {
        throw new AnalyticsServiceError(
          `BI sync provider returned HTTP ${response.status}.`,
          502,
          "BI_SYNC_PROVIDER_ERROR",
        );
      }
      const providerResult = await response.json().catch(() => ({})) as { recordsProcessed?: unknown };
      const recordsProcessed = Number.isFinite(Number(providerResult.recordsProcessed))
        ? Math.max(0, Number(providerResult.recordsProcessed))
        : 0;
      const syncedAt = new Date();
      await prisma.biIntegration.update({
        where: { id: integration.id },
        data: {
          status: "ACTIVE",
          lastSyncAt: syncedAt,
          recordsExported: { increment: recordsProcessed },
        },
      });
      return {
        integrationId: integration.id,
        status: "SYNC_COMPLETED",
        recordsProcessed,
        syncedAt: syncedAt.toISOString(),
        providerStatus: response.status,
      };
    } catch (error) {
      await prisma.biIntegration.update({ where: { id: integration.id }, data: { status: "ERROR" } }).catch(() => undefined);
      if (!(error instanceof AnalyticsServiceError)) {
        console.error("[analytics:triggerBiWarehouseSync]", error);
      }
      throw error;
    }
  }

  /** OData-shaped feed whose counts are computed from tenant records. */
  static async getODataFeed(tenantId?: string) {
    const tenantFilter = tenantId ? { tenantId } : {};
    const [users, invoices, leads, reviews, aiUsage] = await Promise.all([
      prisma.user.count({ where: tenantFilter }),
      prisma.invoice.count({ where: tenantFilter }),
      prisma.crmLead.count({ where: tenantFilter }),
      prisma.review.count({ where: tenantFilter }),
      prisma.aiUsageLog.count({ where: tenantFilter }),
    ]);
    const lastUpdated = new Date().toISOString();
    return {
      "@odata.context": "/api/v1/analytics-engine/bi-integrations/odata/feed/$metadata",
      value: [
        { EntitySet: "Users", Count: users, LastUpdated: lastUpdated },
        { EntitySet: "Invoices", Count: invoices, LastUpdated: lastUpdated },
        { EntitySet: "CrmLeads", Count: leads, LastUpdated: lastUpdated },
        { EntitySet: "Reviews", Count: reviews, LastUpdated: lastUpdated },
        { EntitySet: "AiUsageEvents", Count: aiUsage, LastUpdated: lastUpdated },
      ],
      dataSource: "DATABASE",
    };
  }

  /** Snapshot for SSE clients, backed by current database counts. */
  static async getLiveTelemetry(tenantId?: string) {
    const tenantFilter = tenantId ? { tenantId } : {};
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [activeUsers, revenue, recentErrors] = await Promise.all([
      prisma.user.count({ where: { ...tenantFilter, isActive: true } }),
      prisma.invoice.aggregate({
        where: { ...tenantFilter, status: "PAID", currency: "USD", paidAt: { gte: last30Days } },
        _sum: { amount: true },
      }),
      tenantId
        ? Promise.resolve(0)
        : prisma.systemLog.count({ where: { level: "ERROR", createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } } }),
    ]);
    return {
      event: "METRIC_UPDATE",
      timestamp: new Date().toISOString(),
      activeUsers,
      paidRevenueLast30DaysUSD: revenue._sum.amount ?? 0,
      recentSystemErrors: tenantId ? null : recentErrors,
      systemHealth: "NOT_MEASURED",
      dataSource: "DATABASE",
    };
  }
}
