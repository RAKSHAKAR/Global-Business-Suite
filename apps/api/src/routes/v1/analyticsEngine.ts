import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { AnalyticsEngineService } from "../../services/analyticsEngineService";
import { prisma } from "@saas/database";

export const analyticsEngineRouter = Router();

const sendAnalyticsError = (res: Response, error: any, fallback: string) => {
  const status = Number(error?.statusCode) || 500;
  return res.status(status).json({
    success: false,
    error: error?.message || fallback,
    code: error?.code || "ANALYTICS_ERROR",
  });
};

/**
 * GET /api/v1/analytics-engine/dashboards/:type
 * Get enterprise dashboard by key (Executive, System, Admin, Partner, Customer, Finance, CRM, AI, GBP, Social, etc.)
 */
analyticsEngineRouter.get("/dashboards/:type", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type } = req.params;
    const tenantId = user.tenantId;

    const dashboard = await AnalyticsEngineService.getDomainDashboard(type, tenantId);
    res.json({ success: true, dashboard });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to fetch dashboard metrics");
  }
});

/**
 * GET /api/v1/analytics-engine/scorecards/:type
 * Executive Scorecards for OWNER, PARTNER, or CUSTOMER
 */
analyticsEngineRouter.get("/scorecards/:type", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const type = (req.params.type.toUpperCase() as "OWNER" | "PARTNER" | "CUSTOMER") || "OWNER";
    const scorecard = await AnalyticsEngineService.getExecutiveScorecard(type, user.tenantId);
    res.json({ success: true, scorecard });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to fetch executive scorecard");
  }
});

/**
 * GET /api/v1/analytics-engine/stream/live
 * Real-Time SSE Stream for Dashboards & Telemetry
 */
analyticsEngineRouter.get("/stream/live", authMiddleware, async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const user = (req as any).user;
  let closed = false;
  let fetching = false;
  const writeSnapshot = async () => {
    if (closed || fetching) return;
    fetching = true;
    try {
      const liveUpdate = await AnalyticsEngineService.getLiveTelemetry(user.tenantId);
      if (!closed) res.write(`data: ${JSON.stringify(liveUpdate)}\n\n`);
    } catch (error) {
      console.error("[analytics:sse]", error);
      if (!closed) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Telemetry query failed" })}\n\n`);
      }
    } finally {
      fetching = false;
    }
  };

  res.write(`data: ${JSON.stringify({ event: "CONNECTED", dataSource: "DATABASE" })}\n\n`);
  await writeSnapshot();
  const interval = setInterval(writeSnapshot, 15000);

  req.on("close", () => {
    closed = true;
    clearInterval(interval);
  });
});

/**
 * GET /api/v1/analytics-engine/dashboards/builder/widgets
 * Drag & Drop Widget Library
 */
analyticsEngineRouter.get("/dashboards/builder/widgets", authMiddleware, async (req: Request, res: Response) => {
  try {
    const widgets = [
      { key: "WIDGET_REVENUE_MRR", title: "MRR & ARR Performance", type: "METRIC_CARD", category: "FINANCE" },
      { key: "WIDGET_CHURN_PREDICTION", title: "Predictive Churn Risk", type: "SCORECARD", category: "CRM" },
      { key: "WIDGET_LEAD_FUNNEL", title: "CRM Lead Funnel", type: "FUNNEL", category: "SALES" },
      { key: "WIDGET_GBP_HEATMAP", title: "Google Business Review Heatmap", type: "HEATMAP", category: "GBP" },
      { key: "WIDGET_AI_TOKEN_STREAM", title: "Real-Time AI Token Cost Stream", type: "STREAM_LIVE", category: "AI" },
    ];
    res.json({ success: true, widgets });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch widget catalog" });
  }
});

/**
 * POST /api/v1/analytics-engine/predictive/forecast
 * Predictive Analytics Engine for Revenue, Churn, Growth, Reviews
 */
analyticsEngineRouter.post("/predictive/forecast", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { modelType } = req.body;
    const forecast = await AnalyticsEngineService.getPredictiveForecast(modelType || "REVENUE_ARR", user.tenantId);
    res.json({ success: true, forecast });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to load predictive forecast");
  }
});

/**
 * POST /api/v1/analytics-engine/ai-insights/explain-trend
 * AI Trend & Anomaly Explanation
 */
analyticsEngineRouter.post("/ai-insights/explain-trend", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { metricKey, trendData } = req.body;
    const explanation = await AnalyticsEngineService.explainTrendWithAi(metricKey || "REVENUE_MRR", trendData, user.tenantId);
    res.json({ success: true, explanation });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to explain trend");
  }
});

/**
 * GET /api/v1/analytics-engine/reports
 * List Saved & System Reports
 */
analyticsEngineRouter.get("/reports", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const reports = await prisma.reportDefinition.findMany({
      where: user.tenantId ? { OR: [{ tenantId: user.tenantId }, { isSystemReport: true }] } : {},
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, reports });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch reports list" });
  }
});

/**
 * POST /api/v1/analytics-engine/reports
 * Create Custom Visual Report Definition
 */
analyticsEngineRouter.post("/reports", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, category, reportType, chartType, queryConfigJson, filtersJson, columnsJson, sqlQuery } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, error: "Report title is required", code: "INVALID_REPORT" });
    }

    if (sqlQuery) {
      return res.status(501).json({
        success: false,
        error: "Custom SQL reports are disabled until a tenant-safe query compiler is configured.",
        code: "CUSTOM_SQL_NOT_IMPLEMENTED",
      });
    }

    const report = await prisma.reportDefinition.create({
      data: {
        title: title.trim(),
        description,
        category: category || "GENERAL",
        reportType: reportType || "TABLE",
        chartType: chartType || "BAR",
        queryConfigJson: queryConfigJson ? JSON.stringify(queryConfigJson) : "{}",
        filtersJson: filtersJson ? JSON.stringify(filtersJson) : "[]",
        columnsJson: columnsJson ? JSON.stringify(columnsJson) : "[]",
        sqlQuery: sqlQuery || null,
        tenantId: user.tenantId || null,
        ownerUserId: user.id || user.userId,
      },
    });

    res.status(201).json({ success: true, report });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to create report definition");
  }
});

/**
 * GET /api/v1/analytics-engine/reports/:id
 * Get Report Detail
 */
analyticsEngineRouter.get("/reports/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const report = await prisma.reportDefinition.findFirst({
      where: {
        id: req.params.id,
        ...(user.tenantId ? { OR: [{ tenantId: user.tenantId }, { isSystemReport: true }] } : {}),
      },
    });
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json({ success: true, report });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to fetch report detail");
  }
});

/**
 * POST /api/v1/analytics-engine/reports/:id/execute
 * Execute Visual Report
 */
analyticsEngineRouter.post("/reports/:id/execute", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = await AnalyticsEngineService.executeReportQuery(req.params.id, user.tenantId, req.body);
    res.json({ success: true, result: data });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to execute report");
  }
});

/**
 * POST /api/v1/analytics-engine/reports/:id/clone
 * Clone Report Definition
 */
analyticsEngineRouter.post("/reports/:id/clone", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const existing = await prisma.reportDefinition.findFirst({
      where: {
        id: req.params.id,
        ...(user.tenantId ? { OR: [{ tenantId: user.tenantId }, { isSystemReport: true }] } : {}),
      },
    });
    if (!existing) return res.status(404).json({ error: "Report not found" });

    const cloned = await prisma.reportDefinition.create({
      data: {
        title: `${existing.title} (Copy)`,
        description: existing.description,
        category: existing.category,
        reportType: existing.reportType,
        chartType: existing.chartType,
        queryConfigJson: existing.queryConfigJson,
        filtersJson: existing.filtersJson,
        columnsJson: existing.columnsJson,
        sqlQuery: existing.sqlQuery,
        tenantId: user.tenantId || null,
        ownerUserId: user.id || user.userId,
      },
    });

    res.status(201).json({ success: true, report: cloned });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to clone report");
  }
});

/**
 * POST /api/v1/analytics-engine/reports/ai-builder
 * AI Assisted Report Creation
 */
analyticsEngineRouter.post("/reports/ai-builder", authMiddleware, async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: "AI report building is not configured. Create a category-backed report definition instead.",
    code: "AI_REPORT_BUILDER_NOT_CONFIGURED",
  });
});

/**
 * POST /api/v1/analytics-engine/reports/:id/export
 * Multi-Format Export Engine (PDF, EXCEL, CSV, JSON, PRINT)
 */
analyticsEngineRouter.post("/reports/:id/export", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { format } = req.body;
    const normalizedFormat = String(format || "CSV").toUpperCase() as "PDF" | "EXCEL" | "CSV" | "JSON" | "PRINT";
    const exportResult = await AnalyticsEngineService.exportReportData(req.params.id, normalizedFormat, user.tenantId);
    res.json({ success: true, exportResult });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Export failed");
  }
});

/**
 * POST /api/v1/analytics-engine/reports/:id/deliver
 * Multi-Channel Delivery (Email, WhatsApp, In-App)
 */
analyticsEngineRouter.post("/reports/:id/deliver", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { channels, recipients } = req.body;
    const delivery = await AnalyticsEngineService.deliverScheduledReport(
      req.params.id,
      channels,
      recipients,
      user.tenantId,
    );
    res.json({ success: true, delivery });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Scheduled delivery failed");
  }
});

/**
 * GET /api/v1/analytics-engine/kpis
 * Configurable KPIs list & values
 */
analyticsEngineRouter.get("/kpis", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const kpis = await prisma.kpiDefinition.findMany({
      where: user.tenantId ? { OR: [{ tenantId: user.tenantId }, { isSystem: true }] } : {},
    });
    res.json({ success: true, kpis });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch KPIs" });
  }
});

/**
 * POST /api/v1/analytics-engine/kpis
 * Create / Configure Custom KPI
 */
analyticsEngineRouter.post("/kpis", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { key, name, category, metricType, unit, targetValue, warningThreshold, criticalThreshold } = req.body;

    const kpi = await prisma.kpiDefinition.create({
      data: {
        key: key.toUpperCase(),
        name,
        category: category || "FINANCIAL",
        metricType: metricType || "CURRENCY",
        unit: unit || "USD",
        targetValue: targetValue ?? null,
        warningThreshold: warningThreshold ?? null,
        criticalThreshold: criticalThreshold ?? null,
        tenantId: user.tenantId || null,
      },
    });

    res.status(201).json({ success: true, kpi });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create KPI", details: error?.message });
  }
});

/**
 * POST /api/v1/analytics-engine/custom-sql
 * Custom SQL Query Console (Strict Admin Only)
 */
analyticsEngineRouter.post("/custom-sql", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userRole = String(user.role || (Array.isArray(user.roles) ? user.roles[0] : "") || "").toUpperCase();
    const isAdmin = userRole.includes("ADMIN") || (user.email && user.email.includes("admin"));

    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Custom SQL execution requires ADMIN privileges." });
    }

    const { sql } = req.body;
    const queryResult = await AnalyticsEngineService.executeCustomSql(sql, user.tenantId);
    res.json({ success: true, queryResult });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Custom SQL execution failed");
  }
});

/**
 * GET /api/v1/analytics-engine/alerts
 * Active BI Threshold Alerts
 */
analyticsEngineRouter.get("/alerts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const alerts = await AnalyticsEngineService.processBiAlerts(user.tenantId);
    res.json({ success: true, alerts });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch BI alerts" });
  }
});

/**
 * GET /api/v1/analytics-engine/search
 * Enterprise BI Search across Reports, Dashboards, KPIs, Charts
 */
analyticsEngineRouter.get("/search", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query = (req.query.q as string) || "";
    const tenantReportScope = user.tenantId
      ? { OR: [{ tenantId: user.tenantId }, { isSystemReport: true }] }
      : {};
    const tenantKpiScope = user.tenantId
      ? { OR: [{ tenantId: user.tenantId }, { isSystem: true }] }
      : {};
    const [reports, kpis] = await Promise.all([
      prisma.reportDefinition.findMany({
        where: { ...tenantReportScope, title: { contains: query } },
        take: 10,
      }),
      prisma.kpiDefinition.findMany({
        where: { ...tenantKpiScope, name: { contains: query } },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      query,
      results: {
        reports,
        kpis,
        dashboards: [
          { key: "EXECUTIVE", title: "Executive Dashboard" },
          { key: "FINANCE", title: "Finance & Revenue Dashboard" },
          { key: "GBP", title: "Google Business Profile Dashboard" },
        ].filter((d) => d.title.toLowerCase().includes(query.toLowerCase())),
      },
    });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Enterprise BI search failed");
  }
});

/**
 * GET /api/v1/analytics-engine/bi-integrations
 * List Data Warehouse & External BI Integrations (Power BI, Tableau, Looker, Grafana, Snowflake, BigQuery, Databricks)
 */
analyticsEngineRouter.get("/bi-integrations", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const integrations = await AnalyticsEngineService.listBiIntegrations(user.tenantId);
    res.json({ success: true, integrations });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to list BI integrations");
  }
});

/**
 * POST /api/v1/analytics-engine/bi-integrations
 * Create/Configure External BI Integration
 */
analyticsEngineRouter.post("/bi-integrations", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, platformType, connectionUrl, syncFrequency } = req.body;
    const integration = await AnalyticsEngineService.createBiIntegration({
      tenantId: user.tenantId,
      name,
      platformType,
      connectionUrl,
      syncFrequency,
    });
    res.status(201).json({ success: true, integration });
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to create BI integration");
  }
});

/**
 * POST /api/v1/analytics-engine/bi-integrations/:id/sync
 * Trigger Data Warehouse Push/Refresh Sync
 */
analyticsEngineRouter.post("/bi-integrations/:id/sync", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await AnalyticsEngineService.triggerBiWarehouseSync(req.params.id, user.tenantId);
    res.json({ success: true, result });
  } catch (error: any) {
    sendAnalyticsError(res, error, "BI warehouse sync failed");
  }
});

/**
 * GET /api/v1/analytics-engine/bi-integrations/odata/feed
 * REST/OData Feed Endpoint for Power BI & Tableau
 */
analyticsEngineRouter.get("/bi-integrations/odata/feed", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const feed = await AnalyticsEngineService.getODataFeed(user.tenantId);
    res.json(feed);
  } catch (error: any) {
    sendAnalyticsError(res, error, "Failed to generate OData feed");
  }
});
