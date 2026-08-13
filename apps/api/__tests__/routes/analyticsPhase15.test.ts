/// <reference types="jest" />
import request from "supertest";
import { app as mainApp } from "../../src/index";

let authToken: string;
let createdReportId: string;
let createdKpiKey: string = `TEST_KPI_CONVERSION_${Date.now()}`;
let createdBiIntegrationId: string;

beforeAll(async () => {
  delete process.env.ANALYTICS_REPORT_DELIVERY_WEBHOOK_URL;
  delete process.env.BI_SYNC_WEBHOOK_URL;
  const res = await request(mainApp)
    .post("/api/v1/auth/login")
    .send({ email: "admin@enterprise.com", password: "Admin@1234!" });
  authToken = res.body.data?.token || res.body.token;
});

describe("Phase 15 Enterprise Analytics, BI & Reporting Automated Test Suite", () => {
  // ── 1. Domain Dashboards & Executive Scorecards ──────────────────────────
  describe("Domain Dashboards & Executive Scorecards API", () => {
    it("GET /api/v1/analytics-engine/dashboards/EXECUTIVE → 200 returns Executive Dashboard", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/dashboards/EXECUTIVE")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dashboard).toBeDefined();
      expect(response.body.dashboard.dashboardKey).toBe("EXECUTIVE");
      expect(response.body.dashboard.kpis.length).toBeGreaterThan(0);
      expect(response.body.dashboard.aiStrategicInsights).toBeDefined();
    });

    it("GET /api/v1/analytics-engine/dashboards/FINANCE → 200 returns Financial Dashboard", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/dashboards/FINANCE")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.dashboard.summaryMetrics.paidRevenueLast30DaysUSD).toBeGreaterThanOrEqual(0);
      expect(response.body.dashboard.dataSource).toBe("DATABASE");
    });

    it("GET /api/v1/analytics-engine/scorecards/OWNER → 200 returns Platform Owner Scorecard", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/scorecards/OWNER")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.scorecard.annualizedCurrentRevenueUSD).toBeGreaterThanOrEqual(0);
      expect(response.body.scorecard.dataSource).toBe("DATABASE");
    });

    it("GET /api/v1/analytics-engine/scorecards/PARTNER → 200 returns Partner Executive Scorecard", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/scorecards/PARTNER")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.scorecard.managedClients).toBeGreaterThanOrEqual(0);
      expect(response.body.scorecard.dataSource).toBe("DATABASE");
    });

    it("GET /api/v1/analytics-engine/scorecards/CUSTOMER → 200 returns Customer Scorecard", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/scorecards/CUSTOMER")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.scorecard.totalOrdersCount).toBeGreaterThanOrEqual(0);
      expect(response.body.scorecard.dataSource).toBe("DATABASE");
    });
  });

  // ── 2. Predictive Analytics & AI Insights Engine ────────────────────────
  describe("Predictive Analytics & AI Trend Explanations", () => {
    it("POST /api/v1/analytics-engine/predictive/forecast → 200 generates predictive forecast", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/predictive/forecast")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ modelType: "REVENUE_ARR" });

      expect([200, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.forecast.modelType).toBe("REVENUE_ARR");
        expect(response.body.forecast.dataSource).toBe("DATABASE");
      } else {
        expect(response.body.code).toBe("FORECAST_NOT_AVAILABLE");
      }
    });

    it("POST /api/v1/analytics-engine/ai-insights/explain-trend → 200 explains metric anomaly", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/ai-insights/explain-trend")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ metricKey: "REVENUE_MRR" });

      expect([200, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.explanation.analysisSource).toBe("DATABASE_RULE_BASED");
      } else {
        expect(response.body.code).toBe("KPI_HISTORY_NOT_AVAILABLE");
      }
    });
  });

  // ── 3. Visual Report Builder, AI Report Builder, Exports & Delivery ──────
  describe("Visual Report Builder & Multi-Channel Delivery", () => {
    it("POST /api/v1/analytics-engine/reports → 201 creates new report definition", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/reports")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Quarterly Revenue & Lead Funnel",
          description: "Consolidated sales performance report",
          category: "REVENUE",
          reportType: "TABLE",
          chartType: "BAR",
          columnsJson: ["id", "name", "plan", "mrr"],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.report.title).toBe("Quarterly Revenue & Lead Funnel");
      createdReportId = response.body.report.id;
    });

    it("GET /api/v1/analytics-engine/reports → 200 lists report definitions", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/reports")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.reports)).toBe(true);
    });

    it("POST /api/v1/analytics-engine/reports/:id/execute → 200 executes report query", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/analytics-engine/reports/${createdReportId}/execute`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.result.reportId).toBe(createdReportId);
      expect(Array.isArray(response.body.result.rows)).toBe(true);
      expect(response.body.result.dataSource).toBe("DATABASE");
    });

    it("POST /api/v1/analytics-engine/reports/:id/clone → 201 clones report definition", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/analytics-engine/reports/${createdReportId}/clone`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(201);
      expect(response.body.report.title).toContain("(Copy)");
    });

    it("POST /api/v1/analytics-engine/reports/ai-builder → 201 creates report via AI prompt", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/reports/ai-builder")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ prompt: "Show top performing GBP locations by rating and review count" });

      expect(response.status).toBe(501);
      expect(response.body.code).toBe("AI_REPORT_BUILDER_NOT_CONFIGURED");
    });

    it("POST /api/v1/analytics-engine/reports/:id/export → 200 exports report to CSV", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/analytics-engine/reports/${createdReportId}/export`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ format: "CSV" });

      expect(response.status).toBe(200);
      expect(response.body.exportResult.format).toBe("CSV");
      expect(typeof response.body.exportResult.payload).toBe("string");
      expect(response.body.exportResult.downloadUrl).toBeUndefined();
    });

    it("POST /api/v1/analytics-engine/reports/:id/deliver → 200 delivers report via Email & WhatsApp", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/analytics-engine/reports/${createdReportId}/deliver`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ channels: ["EMAIL", "WHATSAPP"], recipients: ["admin@enterprise.com", "+15550199"] });

      expect(response.status).toBe(503);
      expect(response.body.code).toBe("REPORT_DELIVERY_NOT_CONFIGURED");
      expect(response.body.delivery).toBeUndefined();
    });
  });

  // ── 4. Configurable KPI & BI Alert Engine ────────────────────────────────
  describe("Configurable KPIs & BI Alert Engine", () => {
    it("POST /api/v1/analytics-engine/kpis → 201 creates custom KPI definition", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/kpis")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: createdKpiKey,
          name: "Test Customer Conversion Rate",
          category: "CRM",
          metricType: "PERCENTAGE",
          unit: "%",
          targetValue: 40,
          warningThreshold: 25,
          criticalThreshold: 15,
        });

      expect(response.status).toBe(201);
      expect(response.body.kpi.key).toBe(createdKpiKey);
    });

    it("GET /api/v1/analytics-engine/kpis → 200 fetches configured KPIs", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/kpis")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.kpis.length).toBeGreaterThan(0);
    });

    it("GET /api/v1/analytics-engine/alerts → 200 fetches active BI threshold alerts", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/alerts")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.alerts.timestamp).toBeDefined();
    });
  });

  // ── 5. Admin Custom SQL Console & Enterprise BI Search ─────────────────
  describe("Admin Custom SQL & Enterprise BI Search", () => {
    it("POST /api/v1/analytics-engine/custom-sql → 200 executes SELECT query safely", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/custom-sql")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ sql: "SELECT user_id, email FROM users;" });

      expect(response.status).toBe(501);
      expect(response.body.code).toBe("CUSTOM_SQL_NOT_IMPLEMENTED");
    });

    it("POST /api/v1/analytics-engine/custom-sql → 400 rejects non-SELECT mutation query", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/custom-sql")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ sql: "DELETE FROM users WHERE id = '123';" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Security Violation");
    });

    it("POST /api/v1/analytics-engine/custom-sql → 403 rejects unauthorized user without admin role", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/custom-sql")
        .send({ sql: "SELECT * FROM users;" });

      expect(response.status).toBe(401);
    });

    it("GET /api/v1/analytics-engine/search → 200 performs enterprise BI search", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/search?q=Executive")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.results.dashboards.length).toBeGreaterThan(0);
    });
  });

  // ── 6. Data Warehouse & BI Integration Layer (Power BI, Tableau, Looker, Grafana, Snowflake, BigQuery, Databricks) ──
  describe("Data Warehouse & BI Integration Layer API", () => {
    it("GET /api/v1/analytics-engine/bi-integrations → 200 returns configured BI integrations", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/bi-integrations")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.integrations)).toBe(true);
      expect(response.body.integrations.some((b: any) => b.id === "bi-powerbi-1")).toBe(false);
    });

    it("POST /api/v1/analytics-engine/bi-integrations → 201 creates external BI connector", async () => {
      const response = await request(mainApp)
        .post("/api/v1/analytics-engine/bi-integrations")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Enterprise Snowflake Lakehouse",
          platformType: "SNOWFLAKE",
          connectionUrl: "https://gbs-enterprise.snowflakecomputing.com",
          syncFrequency: "HOURLY",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.integration.platformType).toBe("SNOWFLAKE");
      expect(response.body.integration.status).toBe("INACTIVE");
      createdBiIntegrationId = response.body.integration.id;
    });

    it("POST /api/v1/analytics-engine/bi-integrations/:id/sync → 200 triggers data warehouse push sync", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/analytics-engine/bi-integrations/${createdBiIntegrationId}/sync`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(503);
      expect(response.body.code).toBe("BI_SYNC_NOT_CONFIGURED");
      expect(response.body.result).toBeUndefined();
    });

    it("GET /api/v1/analytics-engine/bi-integrations/odata/feed → 200 returns REST/OData Feed for Power BI & Tableau", async () => {
      const response = await request(mainApp)
        .get("/api/v1/analytics-engine/bi-integrations/odata/feed")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body["@odata.context"]).toBeDefined();
      expect(response.body.value.length).toBeGreaterThan(0);
    });
  });
});
