import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { prisma } from "@saas/database";

export const adminDashboardRouter = Router();

const DASHBOARD_RANGES = {
  "7d": { days: 7, label: "Last 7 days" },
  "30d": { days: 30, label: "Last 30 days" },
  "90d": { days: 90, label: "Last 90 days" },
  "365d": { days: 365, label: "Last 1 year" },
} as const;

type DashboardRangeKey = keyof typeof DASHBOARD_RANGES;

function resolveDashboardRange(value: unknown): {
  key: DashboardRangeKey;
  label: string;
  from: Date;
  to: Date;
  previousFrom: Date;
} {
  const aliases: Record<string, DashboardRangeKey> = {
    "Last 7 days": "7d",
    "Last 30 days": "30d",
    "Last 90 days": "90d",
    "Last 1 year": "365d",
  };
  const requested = typeof value === "string" ? value : "7d";
  const key = (requested in DASHBOARD_RANGES
    ? requested
    : aliases[requested] || "7d") as DashboardRangeKey;
  const option = DASHBOARD_RANGES[key];
  const to = new Date();
  const durationMs = option.days * 24 * 60 * 60 * 1000;
  const from = new Date(to.getTime() - durationMs);

  return {
    key,
    label: option.label,
    from,
    to,
    previousFrom: new Date(from.getTime() - durationMs),
  };
}

function countByStatus(
  groups: Array<{ status: string; _count: number | { _all?: number } }>,
): Record<string, number> {
  return groups.reduce<Record<string, number>>((counts, group) => {
    const key = String(group.status || "UNKNOWN").toUpperCase();
    const value =
      typeof group._count === "number" ? group._count : group._count?._all || 0;
    counts[key] = (counts[key] || 0) + value;
    return counts;
  }, {});
}

function sumStatuses(counts: Record<string, number>, statuses: string[]) {
  return statuses.reduce((total, status) => total + (counts[status] || 0), 0);
}

function buildRevenueSeries(
  payments: Array<{ amount: number; currency: string; createdAt: Date }>,
  from: Date,
  to: Date,
  currency: string | null,
) {
  if (!currency) return [];

  const bucketCount = 7;
  const bucketMs = Math.max(1, (to.getTime() - from.getTime()) / bucketCount);
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    from: new Date(from.getTime() + bucketMs * index),
    to: new Date(from.getTime() + bucketMs * (index + 1)),
    amount: 0,
  }));

  payments
    .filter((payment) => payment.currency === currency)
    .forEach((payment) => {
      const rawIndex = Math.floor(
        (payment.createdAt.getTime() - from.getTime()) / bucketMs,
      );
      const index = Math.min(bucketCount - 1, Math.max(0, rawIndex));
      buckets[index].amount += payment.amount;
    });

  return buckets.map((bucket) => ({
    label: bucket.from.toISOString().slice(0, 10),
    amount: Number(bucket.amount.toFixed(2)),
  }));
}

// GET /api/v1/admin/dashboard/widgets - Database-backed admin telemetry.
adminDashboardRouter.get(
  "/widgets",
  authMiddleware,
  requirePermission("settings", "read", "GLOBAL"),
  async (req: Request, res: Response) => {
    const startedAt = Date.now();
    try {
      const range = resolveDashboardRange(req.query.range);
      const db = prisma as any;

      const [
        totalTenants,
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalPartners,
        activePartners,
        totalCustomers,
        activeCustomers,
        subscriptionGroups,
        payments,
        pendingApprovals,
        totalLocations,
        unrepliedReviews,
        reviewAggregate,
        socialGroups,
        activeAiProviders,
        aiUsageAggregate,
        aiUsageGroups,
        aiQuotaAggregate,
        queueGroups,
        completedJobs,
        notificationCount,
        securityThreatCount,
        failedLoginCount,
        mfaUserCount,
        systemLogGroups,
        auditLogCount,
        recentAuditLogs,
        licenseAggregate,
        storageBuckets,
        aiContentCount,
        socialPostCount,
        marketingCampaignCount,
      ] = await Promise.all([
        db.tenant.count(),
        db.user.count({ where: { isDeleted: false } }),
        db.user.count({
          where: { isDeleted: false, isActive: true, isSuspended: false },
        }),
        db.user.count({
          where: { isDeleted: false, OR: [{ isActive: false }, { isSuspended: true }] },
        }),
        db.user.count({
          where: {
            isDeleted: false,
            roles: { some: { role: { name: { in: ["Partner", "Partner Admin"] } } } },
          },
        }),
        db.user.count({
          where: {
            isDeleted: false,
            isActive: true,
            isSuspended: false,
            approvalStatus: "APPROVED",
            roles: { some: { role: { name: { in: ["Partner", "Partner Admin"] } } } },
          },
        }),
        db.user.count({
          where: {
            isDeleted: false,
            roles: { some: { role: { name: "Customer" } } },
          },
        }),
        db.user.count({
          where: {
            isDeleted: false,
            isActive: true,
            isSuspended: false,
            approvalStatus: "APPROVED",
            roles: { some: { role: { name: "Customer" } } },
          },
        }),
        db.subscription.groupBy({ by: ["status"], _count: true }),
        db.payment.findMany({
          where: {
            status: { in: ["SUCCEEDED", "PAID", "COMPLETED"] },
            createdAt: { gte: range.previousFrom, lte: range.to },
          },
          select: { amount: true, currency: true, createdAt: true },
        }),
        db.approvalRequest.count({ where: { status: "PENDING" } }),
        db.location.count(),
        db.review.count({ where: { replyStatus: "UNREPLIED" } }),
        db.review.aggregate({ _avg: { starRating: true } }),
        db.socialPost.groupBy({
          by: ["status"],
          where: { createdAt: { gte: range.from, lte: range.to } },
          _count: true,
        }),
        db.aiProvider.count({ where: { isActive: true } }),
        db.aiUsageLog.aggregate({
          where: { createdAt: { gte: range.from, lte: range.to } },
          _sum: { totalTokens: true },
          _avg: { latencyMs: true },
          _count: true,
        }),
        db.aiUsageLog.groupBy({
          by: ["status"],
          where: { createdAt: { gte: range.from, lte: range.to } },
          _count: true,
        }),
        db.tenantAiConfig.aggregate({
          where: { isActive: true },
          _sum: { quotaMonthly: true, usageCurrent: true },
        }),
        db.backgroundJobQueue.groupBy({ by: ["status"], _count: true }),
        db.backgroundJobQueue.count({
          where: {
            status: "COMPLETED",
            completedAt: { gte: range.from, lte: range.to },
          },
        }),
        db.notification.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        }),
        db.securityThreatLog.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        }),
        db.loginHistory.count({
          where: {
            isSuccess: false,
            createdAt: { gte: range.from, lte: range.to },
          },
        }),
        db.user.count({
          where: { isDeleted: false, isActive: true, mfaEnabled: true },
        }),
        db.systemLog.groupBy({
          by: ["level"],
          where: { createdAt: { gte: range.from, lte: range.to } },
          _count: true,
        }),
        db.auditLog.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        }),
        db.auditLog.findMany({
          where: { createdAt: { gte: range.from, lte: range.to } },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            action: true,
            resource: true,
            resourceId: true,
            createdAt: true,
          },
        }),
        db.enterpriseLicense.aggregate({
          where: { status: "ACTIVE" },
          _sum: { maxSeats: true, allocatedSeats: true },
          _count: true,
        }),
        db.storageBucket.findMany({
          select: { usedStorageMb: true, maxStorageGb: true },
        }),
        db.aiContent.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        }),
        db.socialPost.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        }),
        db.marketingCampaign.count({
          where: { createdAt: { gte: range.from, lte: range.to } },
        }),
      ]);

      const subscriptionCounts = countByStatus(subscriptionGroups);
      const socialCounts = countByStatus(socialGroups);
      const queueCounts = countByStatus(queueGroups);
      const aiUsageCounts = countByStatus(aiUsageGroups);
      const logCounts = (
        systemLogGroups as Array<{ level: string; _count: number }>
      ).reduce<Record<string, number>>(
        (counts, group) => {
          const key = String(group.level || "UNKNOWN").toUpperCase();
          counts[key] = (counts[key] || 0) + group._count;
          return counts;
        },
        {},
      );

      const currentPayments = payments.filter(
        (payment: { createdAt: Date }) => payment.createdAt >= range.from,
      );
      const previousPayments = payments.filter(
        (payment: { createdAt: Date }) => payment.createdAt < range.from,
      );
      const currencies = Array.from(
        new Set(currentPayments.map((payment: { currency: string }) => payment.currency)),
      ) as string[];
      const currency = currencies.length === 1 ? currencies[0] : null;
      const amountFor = (
        source: Array<{ amount: number; currency: string }>,
        targetCurrency: string | null,
      ) =>
        targetCurrency
          ? source
              .filter((payment) => payment.currency === targetCurrency)
              .reduce((total, payment) => total + payment.amount, 0)
          : null;
      const collectedAmount = amountFor(currentPayments, currency);
      const previousCollectedAmount = amountFor(previousPayments, currency);
      const growthRate =
        collectedAmount != null &&
        previousCollectedAmount != null &&
        previousCollectedAmount > 0
          ? Number(
              (((collectedAmount - previousCollectedAmount) /
                previousCollectedAmount) *
                100).toFixed(1),
            )
          : null;
      const amountsByCurrency = currencies.map((paymentCurrency) => ({
        currency: paymentCurrency,
        amount: Number(
          currentPayments
            .filter(
              (payment: { currency: string }) =>
                payment.currency === paymentCurrency,
            )
            .reduce(
              (total: number, payment: { amount: number }) =>
                total + payment.amount,
              0,
            )
            .toFixed(2),
        ),
      }));

      const aiRequestCount = aiUsageAggregate._count || 0;
      const aiSuccessCount = sumStatuses(aiUsageCounts, ["SUCCESS"]);
      const storageUsedMb = storageBuckets.reduce(
        (total: number, bucket: { usedStorageMb: number }) =>
          total + bucket.usedStorageMb,
        0,
      );
      const storageCapacityGb = storageBuckets.reduce(
        (total: number, bucket: { maxStorageGb: number }) =>
          total + bucket.maxStorageGb,
        0,
      );
      const allocatedSeats = licenseAggregate._sum?.maxSeats || 0;
      const usedSeats = licenseAggregate._sum?.allocatedSeats || 0;
      const activityTotal =
        aiContentCount + socialPostCount + marketingCampaignCount;
      const serviceUsage = [
        { key: "aiContent", label: "AI content", count: aiContentCount },
        { key: "socialPosts", label: "Social posts", count: socialPostCount },
        {
          key: "marketingCampaigns",
          label: "Marketing campaigns",
          count: marketingCampaignCount,
        },
      ].map((item) => ({
        ...item,
        percent:
          activityTotal > 0
            ? Number(((item.count / activityTotal) * 100).toFixed(1))
            : 0,
      }));

      const observedAt = new Date();

      const widgetsData = {
        range: {
          key: range.key,
          label: range.label,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        },
        systemOverview: {
          status: "AVAILABLE",
          uptimeSeconds: Math.floor(process.uptime()),
          version: process.env.APP_VERSION || process.env.npm_package_version || null,
          nodeEnv: process.env.NODE_ENV || "development",
          region: process.env.AWS_REGION || process.env.REGION || null,
          observedAt: observedAt.toISOString(),
          tenantCount: totalTenants,
          databaseStatus: "CONNECTED",
        },
        activeUsers: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
        },
        activePartners: { total: totalPartners, active: activePartners },
        activeCustomers: { total: totalCustomers, active: activeCustomers },
        subscriptionSummary: {
          active: sumStatuses(subscriptionCounts, ["ACTIVE"]),
          trial: sumStatuses(subscriptionCounts, ["TRIAL", "TRIALING"]),
          canceled: sumStatuses(subscriptionCounts, ["CANCELED", "CANCELLED"]),
          pastDue: sumStatuses(subscriptionCounts, ["PAST_DUE", "PASTDUE"]),
          total: Object.values(subscriptionCounts).reduce(
            (total, count) => total + count,
            0,
          ),
        },
        revenueOverview: {
          collectedAmount:
            collectedAmount == null ? null : Number(collectedAmount.toFixed(2)),
          previousCollectedAmount:
            previousCollectedAmount == null
              ? null
              : Number(previousCollectedAmount.toFixed(2)),
          currency,
          growthRate,
          amountsByCurrency,
          series: buildRevenueSeries(
            currentPayments,
            range.from,
            range.to,
            currency,
          ),
        },
        googleBusinessStatus: {
          connectedLocations: totalLocations,
          unrepliedReviews,
          avgRating:
            reviewAggregate._avg?.starRating == null
              ? null
              : Number(reviewAggregate._avg.starRating.toFixed(2)),
        },
        socialMediaStatus: {
          totalPosts: Object.values(socialCounts).reduce(
            (total, count) => total + count,
            0,
          ),
          scheduled: sumStatuses(socialCounts, ["SCHEDULED"]),
          publishing: sumStatuses(socialCounts, ["PUBLISHING"]),
          published: sumStatuses(socialCounts, ["PUBLISHED"]),
          failed: sumStatuses(socialCounts, ["FAILED", "PARTIALLY_PUBLISHED"]),
          pendingApproval: sumStatuses(socialCounts, ["PENDING_APPROVAL"]),
        },
        aiProviderStatus: {
          activeProviders: activeAiProviders,
          tokensUsed: aiUsageAggregate._sum?.totalTokens || 0,
          configuredMonthlyQuota: aiQuotaAggregate._sum?.quotaMonthly || 0,
          configuredUsageCurrent: aiQuotaAggregate._sum?.usageCurrent || 0,
          requestCount: aiRequestCount,
          successRate:
            aiRequestCount > 0
              ? Number(((aiSuccessCount / aiRequestCount) * 100).toFixed(1))
              : null,
          averageLatencyMs:
            aiUsageAggregate._avg?.latencyMs == null
              ? null
              : Math.round(aiUsageAggregate._avg.latencyMs),
        },
        apiHealth: {
          status: "RESPONDING",
          observedAt: observedAt.toISOString(),
          requestDurationMs: Date.now() - startedAt,
          requestVolume: null,
          errorRate: null,
          note: "Gateway request-volume and error-rate telemetry is not connected.",
        },
        queueStatus: {
          activeJobs: sumStatuses(queueCounts, ["PROCESSING"]),
          waitingJobs: sumStatuses(queueCounts, ["QUEUED"]),
          completedInRange: completedJobs,
          failed: sumStatuses(queueCounts, ["FAILED", "DLQ"]),
        },
        backgroundJobs: {
          scheduled: sumStatuses(queueCounts, ["QUEUED"]),
          running: sumStatuses(queueCounts, ["PROCESSING"]),
          failed: sumStatuses(queueCounts, ["FAILED", "DLQ"]),
          monitoringConnected: true,
        },
        notifications: {
          createdInRange: notificationCount,
          deliveryRate: null,
          note: "Delivery-provider telemetry is not connected.",
        },
        securityAlerts: {
          threatsInRange: securityThreatCount,
          failedLoginsInRange: failedLoginCount,
          mfaEnabledUsers: mfaUserCount,
        },
        failedJobs: {
          count: sumStatuses(queueCounts, ["FAILED", "DLQ"]),
          lastFailure: null,
        },
        systemLogs: {
          totalLogs: Object.values(logCounts).reduce(
            (total, count) => total + count,
            0,
          ),
          errorLogs: sumStatuses(logCounts, ["ERROR", "FATAL"]),
          warningLogs: sumStatuses(logCounts, ["WARN", "WARNING"]),
          infoLogs: sumStatuses(logCounts, ["INFO"]),
        },
        auditLogs: {
          totalLogs: auditLogCount,
          recentActionsCount: recentAuditLogs.length,
          recent: recentAuditLogs.map(
            (entry: {
              id: string;
              action: string;
              resource: string;
              resourceId: string | null;
              createdAt: Date;
            }) => ({
              ...entry,
              createdAt: entry.createdAt.toISOString(),
            }),
          ),
        },
        licenseUsage: {
          licenseCount: licenseAggregate._count || 0,
          allocatedSeats,
          usedSeats,
          available: Math.max(0, allocatedSeats - usedSeats),
          utilization:
            allocatedSeats > 0
              ? Number(((usedSeats / allocatedSeats) * 100).toFixed(1))
              : null,
        },
        storageUsage: {
          bucketCount: storageBuckets.length,
          usedMb: Number(storageUsedMb.toFixed(2)),
          totalGb: storageCapacityGb,
          percentUsed:
            storageCapacityGb > 0
              ? Number(
                  ((storageUsedMb / (storageCapacityGb * 1024)) * 100).toFixed(
                    2,
                  ),
                )
              : null,
        },
        performanceMetrics: {
          monitoringConnected: false,
          cpuUsagePercent: null,
          memoryUsagePercent: null,
          diskUsagePercent: null,
          networkIoPercent: null,
          dbConnectionCount: null,
          note: "Infrastructure monitoring is not connected.",
        },
        serviceUsage,
        pendingApprovals,
      };

      res.json({
        widgets: widgetsData,
        meta: {
          source: "database",
          observedAt: observedAt.toISOString(),
          range: widgetsData.range,
        },
      });
    } catch (error: any) {
      console.error("[adminDashboard:widgets]", error);
      res.status(500).json({
        success: false,
        error: "Dashboard telemetry is unavailable",
        code: "DASHBOARD_TELEMETRY_UNAVAILABLE",
      });
    }
  }
);

// GET /api/v1/admin/dashboard/layout - Get user saved layout
adminDashboardRouter.get(
  "/layout",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const layout = await (prisma as any).dashboardLayout.findUnique({
        where: { userId: user.id || user.userId },
      });
      res.json({ layoutJson: layout?.layoutJson || "[]" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch dashboard layout" });
    }
  }
);

// PUT /api/v1/admin/dashboard/layout - Save user layout
adminDashboardRouter.put(
  "/layout",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { layoutJson } = req.body;
      const userId = user.id || user.userId;

      const updated = await (prisma as any).dashboardLayout.upsert({
        where: { userId },
        update: { layoutJson: JSON.stringify(layoutJson) },
        create: { userId, layoutJson: JSON.stringify(layoutJson) },
      });

      res.json({ message: "Dashboard layout saved successfully", layout: updated });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save dashboard layout" });
    }
  }
);
