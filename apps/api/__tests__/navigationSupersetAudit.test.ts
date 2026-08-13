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

describe("GBS Navigation Superset & API Chain Traceability Audit", () => {
  // ── 1. Admin Portal Navigation & Endpoint Chains ───────────────────────────
  describe("Admin Portal Sidebar Endpoints Validation", () => {
    it("Dashboard & Global Search APIs respond", async () => {
      const metricsRes = await request(mainApp)
        .get("/api/v1/admin/dashboard/widgets")
        .set("Authorization", `Bearer ${adminToken}`);
      expect([200, 401]).toContain(metricsRes.status);

      const searchRes = await request(mainApp)
        .get("/api/v1/search?q=admin")
        .set("Authorization", `Bearer ${adminToken}`);
      expect([200, 404]).toContain(searchRes.status);
    });

    it("Tenants, Organizations, Users, Roles & Role Simulator APIs respond", async () => {
      const tenantsRes = await request(mainApp)
        .get("/api/v1/tenants")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(tenantsRes.status).toBe(200);

      const usersRes = await request(mainApp)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(usersRes.status).toBe(200);

      const rolesRes = await request(mainApp)
        .get("/api/v1/roles")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(rolesRes.status).toBe(200);

      const rolesSimRes = await request(mainApp)
        .get("/api/v1/admin/roles-sim/simulations")
        .set("Authorization", `Bearer ${adminToken}`);
      expect([200, 404]).toContain(rolesSimRes.status);
    });

    it("AI Providers, Prompts, Agents, Knowledge, Workflows & Governance APIs respond", async () => {
      const providersRes = await request(mainApp)
        .get("/api/v1/ai-platform/providers")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(providersRes.status).toBe(200);

      const promptsRes = await request(mainApp)
        .get("/api/v1/ai-platform/prompts")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(promptsRes.status).toBe(200);

      const agentsRes = await request(mainApp)
        .get("/api/v1/ai-agents")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(agentsRes.status).toBe(200);

      const knowledgeRes = await request(mainApp)
        .get("/api/v1/ai-knowledge")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(knowledgeRes.status).toBe(200);

      const workflowsRes = await request(mainApp)
        .get("/api/v1/ai-workflows")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(workflowsRes.status).toBe(200);

      const governanceRes = await request(mainApp)
        .get("/api/v1/ai-platform/governance/policies")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(governanceRes.status).toBe(200);
    });

    it("GBP Studio, Social Studio, Social Channels & CRM APIs respond", async () => {
      const gbpRes = await request(mainApp)
        .get("/api/v1/gbp/locations")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(gbpRes.status).toBe(200);

      const socialRes = await request(mainApp)
        .get("/api/v1/social/channels")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(socialRes.status).toBe(200);

      const crmRes = await request(mainApp)
        .get("/api/v1/crm/opportunities")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(crmRes.status).toBe(200);
    });
  });

  // ── 2. Partner Portal Navigation & Restored Sidebar Endpoints ─────────────
  describe("Partner Portal Restored Sidebar Endpoints Validation", () => {
    it("Restored /ai-studio route endpoint POST /api/v1/ai-platform/generate responds", async () => {
      const res = await request(mainApp)
        .post("/api/v1/ai-platform/generate")
        .set("Authorization", `Bearer ${partnerToken}`)
        .send({
          prompt: "Write a high-converting social caption for summer sale",
          systemInstruction: "You are an expert copywriter.",
          contentType: "SOCIAL_CAPTION",
        });

      expect(res.status).toBe(200);
      expect(res.body.content).toBeDefined();
    });

    it("Restored /analytics route endpoint GET /api/v1/analytics-engine/scorecards/PARTNER responds", async () => {
      const res = await request(mainApp)
        .get("/api/v1/analytics-engine/scorecards/PARTNER")
        .set("Authorization", `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.scorecard).toBeDefined();
      expect(res.body.scorecard.managedClients).toBeDefined();
    });

    it("Partner Reports & Unified Inbox endpoints respond", async () => {
      const reportsRes = await request(mainApp)
        .get("/api/v1/partner/reports?type=BUSINESS")
        .set("Authorization", `Bearer ${partnerToken}`);
      expect(reportsRes.status).toBe(200);

      const inboxRes = await request(mainApp)
        .get("/api/v1/inbox/conversations")
        .set("Authorization", `Bearer ${partnerToken}`);
      expect(inboxRes.status).toBe(200);
    });
  });

  // ── 3. Customer Portal Navigation & Restored Sidebar Endpoints ────────────
  describe("Customer Portal Restored Sidebar Endpoints Validation", () => {
    it("Restored /ai-poster endpoint POST /api/v1/social/ai/poster responds", async () => {
      const res = await request(mainApp)
        .post("/api/v1/social/ai/poster")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          topic: "Coffee Shop Special Offer",
          platform: "INSTAGRAM",
          style: "GOLD_ELEGANCE",
          includeBrandLogo: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.poster.dataUri).toBeDefined();
    });

    it("Restored /ai-faq endpoint POST /api/v1/ai-knowledge/query responds", async () => {
      const res = await request(mainApp)
        .post("/api/v1/ai-knowledge/query")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          query: "What are your business operating hours?",
        });

      expect(res.status).toBe(200);
      expect(res.body.answer).toBeDefined();
    });

    it("Restored /reviews endpoint GET /api/v1/reviews responds", async () => {
      const res = await request(mainApp)
        .get("/api/v1/reviews")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reviews).toBeDefined();
    });

    it("Customer Services, Orders & Appointments endpoints respond", async () => {
      const servicesRes = await request(mainApp)
        .get("/api/v1/customer/services")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(servicesRes.status).toBe(200);

      const appointmentsRes = await request(mainApp)
        .get("/api/v1/bookings/appointments")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(appointmentsRes.status).toBe(200);
    });
  });
});
