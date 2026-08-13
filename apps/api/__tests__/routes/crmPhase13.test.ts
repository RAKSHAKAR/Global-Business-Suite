/// <reference types="jest" />
import request from "supertest";
import { app as mainApp } from "../../src/index";

let authToken: string;
let createdLeadId: string;
let createdAccountId: string;
let createdContactId: string;
let createdOpportunityId: string;
let createdCampaignId: string;
let createdDocumentId: string;

beforeAll(async () => {
  const res = await request(mainApp)
    .post("/api/v1/auth/login")
    .send({ email: "admin@enterprise.com", password: "Admin@1234!" });
  authToken = res.body.data?.token || res.body.token;
});

describe("Phase 13 Enterprise CRM, Sales, Marketing & Customer Success API Suite", () => {
  // ── 1. Lead Management Subsystem ──────────────────────────────────────────
  describe("Lead Management API", () => {
    it("POST /api/v1/crm/leads/capture → 201 captures new website lead", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/leads/capture")
        .send({
          firstName: "Samantha",
          lastName: "Vance",
          email: "samantha.vance@techcorp.com",
          phone: "+1-555-0199",
          companyName: "TechCorp Global",
          jobTitle: "VP of Digital Transformation",
          source: "WEBSITE_FORM",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.lead).toBeDefined();
      expect(response.body.lead.email).toBe("samantha.vance@techcorp.com");
      createdLeadId = response.body.lead.id;
    });

    it("GET /api/v1/crm/leads → 200 lists captured leads", async () => {
      const response = await request(mainApp)
        .get("/api/v1/crm/leads")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.leads)).toBe(true);
      expect(response.body.leads.length).toBeGreaterThan(0);
    });

    it("POST /api/v1/crm/leads/:id/score → 200 calculates AI lead score", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/crm/leads/${createdLeadId}/score`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.lead.score).toBeGreaterThan(50);
      expect(response.body.lead.aiInsights).toBeDefined();
    });

    it("GET /api/v1/crm/leads/duplicates/detect → 200 detects duplicate leads", async () => {
      const response = await request(mainApp)
        .get("/api/v1/crm/leads/duplicates/detect")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.duplicateCount).toBeDefined();
    });

    it("POST /api/v1/crm/leads/:id/convert → 200 converts lead to Contact & Opportunity", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/crm/leads/${createdLeadId}/convert`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ dealTitle: "TechCorp Enterprise Cloud Deal", dealValue: 85000 });

      expect(response.status).toBe(200);
      expect(response.body.lead.status).toBe("CONVERTED");
      expect(response.body.contact).toBeDefined();
      expect(response.body.opportunity).toBeDefined();
      createdContactId = response.body.contact.id;
      createdOpportunityId = response.body.opportunity.id;
    });
  });

  // ── 2. Account & Contact Management Subsystem ─────────────────────────────
  describe("Contact & Account Management API", () => {
    it("POST /api/v1/crm/accounts → 201 creates B2B Organization Account", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/accounts")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Apex Solutions Inc",
          accountType: "PROSPECT",
          industry: "Software",
          website: "https://apexsolutions.com",
          annualRevenue: 5000000,
          employeeCount: 250,
        });

      expect(response.status).toBe(201);
      expect(response.body.account).toBeDefined();
      expect(response.body.account.name).toBe("Apex Solutions Inc");
      createdAccountId = response.body.account.id;
    });

    it("GET /api/v1/crm/accounts → 200 fetches accounts directory", async () => {
      const response = await request(mainApp)
        .get("/api/v1/crm/accounts")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.accounts)).toBe(true);
    });

    it("POST /api/v1/crm/contacts → 201 creates contact linked to account", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/contacts")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          accountId: createdAccountId,
          firstName: "Marcus",
          lastName: "Brody",
          email: "marcus.brody@apexsolutions.com",
          phone: "+1-555-9011",
          designation: "CTO",
        });

      expect(response.status).toBe(201);
      expect(response.body.contact).toBeDefined();
    });

    it("PUT /api/v1/crm/contacts/:id/preferences → 200 updates opt-in consent preferences", async () => {
      const response = await request(mainApp)
        .put(`/api/v1/crm/contacts/${createdContactId}/preferences`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ emailOptIn: true, smsOptIn: false, whatsappOptIn: true, pushOptIn: true });

      expect(response.status).toBe(200);
      expect(response.body.contact.communicationPreferencesJson).toContain("whatsapp\":true");
    });
  });

  // ── 3. Opportunities & Sales Pipelines Subsystem ──────────────────────────
  describe("Sales Pipelines & Opportunity API", () => {
    it("GET /api/v1/admin/crm/pipelines → 200 returns pipelines & stages", async () => {
      const response = await request(mainApp)
        .get("/api/v1/admin/crm/pipelines")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.pipelines)).toBe(true);
    });

    it("POST /api/v1/admin/crm/pipelines → 201 creates custom sales pipeline", async () => {
      const response = await request(mainApp)
        .post("/api/v1/admin/crm/pipelines")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Strategic Enterprise Pipeline",
          description: "High-value deals",
          stages: [
            { name: "Initial Pitch", order: 1, winProbability: 15 },
            { name: "Technical Proof of Concept", order: 2, winProbability: 40 },
            { name: "Legal Review", order: 3, winProbability: 80 },
            { name: "Won", order: 4, winProbability: 100, isWonStage: true },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.pipeline.name).toBe("Strategic Enterprise Pipeline");
      expect(response.body.pipeline.stages.length).toBe(4);
    });

    it("PUT /api/v1/admin/crm/opportunities/:id/stage → 200 moves deal stage & updates status to WON", async () => {
      const response = await request(mainApp)
        .put(`/api/v1/admin/crm/opportunities/${createdOpportunityId}/stage`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "WON", winLossReason: "Superior AI capabilities and platform security" });

      expect(response.status).toBe(200);
      expect(response.body.opportunity.status).toBe("WON");
    });

    it("GET /api/v1/admin/crm/analytics → 200 returns sales analytics", async () => {
      const response = await request(mainApp)
        .get("/api/v1/admin/crm/analytics")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.analytics.wonRevenue).toBeGreaterThan(0);
      expect(response.body.analytics.winRatePercentage).toBeGreaterThan(0);
    });
  });

  // ── 4. Omnichannel Marketing Automation Subsystem ─────────────────────────
  describe("Marketing Automation API", () => {
    it("POST /api/v1/crm/marketing/campaigns → 201 creates campaign with A/B variants", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/marketing/campaigns")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Global Launch Announcement",
          channel: "EMAIL",
          subject: "Introducing Phase 13 Enterprise Suite",
          content: "Experience next-gen AI CRM & Customer Success platform.",
          abVariants: [
            { variantName: "Variant A - Direct", subject: "Upgrade your CRM now" },
            { variantName: "Variant B - Question", subject: "Ready for 10x CRM productivity?" },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.campaign.name).toBe("Global Launch Announcement");
      expect(response.body.campaign.abVariants.length).toBe(2);
      createdCampaignId = response.body.campaign.id;
    });

    it("POST /api/v1/crm/marketing/campaigns/:id/dispatch → 200 dispatches campaign", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/crm/marketing/campaigns/${createdCampaignId}/dispatch`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.campaign.status).toBe("COMPLETED");
      expect(response.body.analytics.sent).toBeGreaterThan(0);
    });

    it("POST /api/v1/crm/marketing/segments → 201 creates dynamic audience segment", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/marketing/segments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "High Intent Decision Makers",
          criteria: { minScore: 75, jobTitle: "VP" },
        });

      expect(response.status).toBe(201);
      expect(response.body.segment.name).toBe("High Intent Decision Makers");
    });
  });

  // ── 5. Customer Success & Health Subsystem ────────────────────────────────
  describe("Customer Success API", () => {
    it("GET /api/v1/crm/customer-success/health → 200 returns health scores matrix", async () => {
      const response = await request(mainApp)
        .get("/api/v1/crm/customer-success/health")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.healthScores)).toBe(true);
    });

    it("POST /api/v1/crm/customer-success/health/calculate → 200 calculates overall health & AI churn risk", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/customer-success/health/calculate")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ accountId: createdAccountId, npsScore: 9.5, csatScore: 4.9, usageScore: 95, supportScore: 98 });

      expect(response.status).toBe(200);
      expect(response.body.health.overallScore).toBeGreaterThan(80);
      expect(response.body.health.scoreCategory).toBe("HEALTHY");
      expect(response.body.health.aiChurnRiskScore).toBeLessThan(10);
    });

    it("POST /api/v1/crm/customer-success/plans → 201 creates onboarding success plan", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/customer-success/plans")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          accountId: createdAccountId,
          title: "Apex Solutions Onboarding Program",
          milestones: [
            { name: "Environment Setup", completed: true },
            { name: "API Gateway Integration", completed: true },
            { name: "Go Live", completed: false },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.plan.title).toBe("Apex Solutions Onboarding Program");
    });

    it("POST /api/v1/crm/customer-success/feedback → 201 submits NPS customer feedback", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/customer-success/feedback")
        .send({
          type: "NPS",
          rating: 10,
          comments: "Exceptional platform performance and customer support!",
          category: "PRODUCT",
        });

      expect(response.status).toBe(201);
      expect(response.body.feedback.rating).toBe(10);
    });
  });

  // ── 6. CRM Documents & Digital Signatures Subsystem ───────────────────────
  describe("CRM Documents & Digital Signatures API", () => {
    it("POST /api/v1/crm/documents → 201 creates quote/proposal document", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/documents")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Apex Solutions Enterprise Agreement",
          docType: "CONTRACT",
          totalAmount: 85000,
        });

      expect(response.status).toBe(201);
      expect(response.body.document.name).toBe("Apex Solutions Enterprise Agreement");
      createdDocumentId = response.body.document.id;
    });

    it("POST /api/v1/crm/documents/:id/sign → 200 executes cryptographic Digital Signature", async () => {
      const response = await request(mainApp)
        .post(`/api/v1/crm/documents/${createdDocumentId}/sign`)
        .send({
          signerName: "Marcus Brody",
          signerEmail: "marcus.brody@apexsolutions.com",
          ipAddress: "192.168.1.100",
        });

      expect(response.status).toBe(200);
      expect(response.body.document.status).toBe("SIGNED");
      expect(response.body.signatureData.hash).toContain("SHA256");
    });
  });

  // ── 7. AI Platform CRM Engines ───────────────────────────────────────────
  describe("AI Platform CRM Features API", () => {
    it("POST /api/v1/crm/ai/score-lead → 200 returns predictive AI lead score & next best action", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/ai/score-lead")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          companyName: "Global Finance Corp",
          jobTitle: "Chief Information Officer",
          email: "cio@globalfinance.com",
          websiteActivityCount: 8,
        });

      expect(response.status).toBe(200);
      expect(response.body.aiLeadScore).toBeGreaterThan(70);
      expect(response.body.tier).toBe("HOT");
      expect(response.body.nextBestAction).toBeDefined();
    });

    it("POST /api/v1/crm/ai/deal-insights → 200 returns deal win/loss insights", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/ai/deal-insights")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          opportunityId: createdOpportunityId,
          title: "TechCorp Enterprise Cloud Deal",
          value: 85000,
          probability: 80,
          stageName: "Negotiation",
        });

      expect(response.status).toBe(200);
      expect(response.body.insights.winProbability).toBeGreaterThan(70);
      expect(Array.isArray(response.body.insights.aiRecommendations)).toBe(true);
    });

    it("POST /api/v1/crm/ai/forecast → 200 returns revenue forecast", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/ai/forecast")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.weightedForecastValue).toBeDefined();
      expect(response.body.aiConfidenceScore).toBe(91.5);
    });

    it("POST /api/v1/crm/ai/generate-email → 200 generates personalized sales email", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/ai/generate-email")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ leadName: "Samantha", companyName: "TechCorp", emailType: "INTRO" });

      expect(response.status).toBe(200);
      expect(response.body.subject).toContain("TechCorp");
      expect(response.body.body).toContain("Samantha");
    });
  });

  // ── 8. Integrations (Google Business Profile & Social Media) ──────────────
  describe("GBP & Social CRM Integrations API", () => {
    it("POST /api/v1/crm/integrations/google-business/sync-leads → 200 syncs GBP leads", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/integrations/google-business/sync-leads")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("POST /api/v1/crm/integrations/social/sync-leads → 200 syncs Social Media leads", async () => {
      const response = await request(mainApp)
        .post("/api/v1/crm/integrations/social/sync-leads")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
