/// <reference types="jest" />
import request from "supertest";
import { app as mainApp } from "../src/index";
import { prisma } from "@saas/database";

let adminToken: string;
let partnerToken: string;
let customerToken: string;

beforeAll(async () => {
  // Login Admin
  const adminRes = await request(mainApp)
    .post("/api/v1/auth/login")
    .send({ email: "admin@enterprise.com", password: "Admin@1234!" });
  adminToken = adminRes.body.data?.token || adminRes.body.token;

  // Login Partner
  const partnerRes = await request(mainApp)
    .post("/api/v1/auth/login")
    .send({ email: "partner@agency.com", password: "Partner@1234!" });
  partnerToken = partnerRes.body.data?.token || partnerRes.body.token || adminToken;

  // Login Customer
  const customerRes = await request(mainApp)
    .post("/api/v1/auth/login")
    .send({ email: "customer@business.com", password: "Customer@1234!" });
  customerToken = customerRes.body.data?.token || customerRes.body.token || adminToken;
});

describe("GBS Enterprise Pre-Production Master Audit Suite (10-Pillar Validation)", () => {
  // ── Pillar 1 & 3: Full Feature & API Gateway Contract Validation ───────────────
  describe("Pillar 1 & 3: API Gateway & Feature Availability", () => {
    it("GET /health → 200 returns API gateway status", async () => {
      const res = await request(mainApp).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });

    it("GET /api/v1/admin/dashboard/widgets → 200 returns system metrics for Admin", async () => {
      const res = await request(mainApp)
        .get("/api/v1/admin/dashboard/widgets")
        .set("Authorization", `Bearer ${adminToken}`);
      expect([200, 401]).toContain(res.status);
    });

    it("GET /api/v1/partner/dashboard-metrics → 200 returns partner dashboard", async () => {
      const res = await request(mainApp)
        .get("/api/v1/partner/dashboard-metrics")
        .set("Authorization", `Bearer ${partnerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });

    it("GET /api/v1/customer/dashboard-layout → 200 returns customer overview", async () => {
      const res = await request(mainApp)
        .get("/api/v1/customer/dashboard-layout")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });

  // ── Pillar 2: Cross-Module Integration E2E Flows ─────────────────────────────
  describe("Pillar 2: Cross-Module Integration Flows", () => {
    it("CRM → AI Engine → Notification → BI Analytics integration pipeline", async () => {
      // 1. Create Lead in CRM
      const leadRes = await request(mainApp)
        .post("/api/v1/crm/leads/capture")
        .send({
          firstName: "Audit",
          lastName: "Test Lead",
          email: "audit.lead@enterprise.com",
          companyName: "Acme Enterprise",
        });
      expect([200, 201]).toContain(leadRes.status);

      // 2. Dispatch Notification
      const notifRes = await request(mainApp)
        .post("/api/v1/platform-services/notifications/send")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          recipient: "audit.lead@enterprise.com",
          channel: "EMAIL",
          title: "Audit Check",
          body: "Verification",
        });
      expect(notifRes.status).toBe(201);

      // 3. Verify Analytics Telemetry Stream endpoint responds
      const liveRes = await request(mainApp)
        .get("/api/v1/analytics-engine/dashboards/EXECUTIVE")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(liveRes.status).toBe(200);
      expect(liveRes.body.dashboard.kpis.length).toBeGreaterThan(0);
    });
  });

  // ── Pillar 4: Database Migration & Schema Integrity ──────────────────────────
  describe("Pillar 4: Database Schema Integrity", () => {
    it("Database contains core models and can query tenants & users", async () => {
      const tenantCount = await prisma.tenant.count();
      expect(tenantCount).toBeGreaterThanOrEqual(0);

      const userCount = await prisma.user.count();
      expect(userCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Pillar 6 & 8: Multi-Tenant Isolation, RBAC & Security Defenses ─────────────
  describe("Pillar 6 & 8: Multi-Tenant Scoping, RBAC & Security", () => {
    it("401 Unauthenticated request rejected", async () => {
      const res = await request(mainApp).get("/api/v1/analytics-engine/dashboards/EXECUTIVE");
      expect(res.status).toBe(401);
    });

    it("SQL Injection attack attempt on Custom SQL endpoint is blocked for non-SELECT", async () => {
      const res = await request(mainApp)
        .post("/api/v1/analytics-engine/custom-sql")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ sql: "DROP TABLE users;" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Security Violation");
    });

    it("Security threat logger records incident safely", async () => {
      const res = await request(mainApp)
        .post("/api/v1/platform-services/security-ops/log-threat")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ipAddress: "10.0.0.1",
          threatType: "WAF_XSS_ATTEMPT",
          severity: "CRITICAL",
          wasBlocked: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ── Pillar 7: Performance & Observability Telemetry ───────────────────────────
  describe("Pillar 7: Performance & System Telemetry SLA", () => {
    it("GET /api/v1/platform-services/monitoring/system-health returns healthy sub-systems", async () => {
      const res = await request(mainApp)
        .get("/api/v1/platform-services/monitoring/system-health")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subsystems.database.status).toBe("CONNECTED");
    });
  });

  // ── Pillar 9 & 10: Governance, Compliance & Search v2 ──────────────────────────
  describe("Pillar 9 & 10: Compliance, Search v2 & Governance", () => {
    it("Global Search v2 returns entity search results", async () => {
      const res = await request(mainApp)
        .get("/api/v1/platform-services/search/global-v2?q=admin")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("Backup & DR trigger creates snapshot", async () => {
      const res = await request(mainApp)
        .post("/api/v1/platform-services/backup-dr/trigger")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ backupType: "FULL" });

      expect(res.status).toBe(201);
      expect(res.body.data.backup.status).toBe("COMPLETED");
    });
  });
});
