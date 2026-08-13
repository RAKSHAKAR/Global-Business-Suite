import express from "express";
import request from "supertest";
import { partnerPortalRouter } from "../../../routes/v1/partnerPortal";

const app = express();
app.use(express.json());
app.use("/api/v1/partner", partnerPortalRouter);

describe("GBS Phase 5 – Enterprise Partner Portal Module Test Suite", () => {
  it("GET /api/v1/partner/dashboard-layout — returns partner dashboard layout", async () => {
    const res = await request(app).get("/api/v1/partner/dashboard-layout");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("layoutJson");
  });

  it("PUT /api/v1/partner/dashboard-layout — updates dashboard widget layout", async () => {
    const customWidgets = [{ id: "revenue_widget", visible: true, order: 1 }];
    const res = await request(app)
      .put("/api/v1/partner/dashboard-layout")
      .send({ layoutJson: JSON.stringify(customWidgets) });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("userId");
  });

  it("GET /api/v1/partner/dashboard-metrics — returns aggregated telemetry", async () => {
    const res = await request(app).get("/api/v1/partner/dashboard-metrics");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("customerCount");
  });

  it("GET /api/v1/partner/business-profile — returns business details and branches", async () => {
    const res = await request(app).get("/api/v1/partner/business-profile");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("workingHours");
  });

  it("GET /api/v1/partner/team — lists team members", async () => {
    const res = await request(app).get("/api/v1/partner/team");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("team");
  });

  it("POST /api/v1/partner/team/invite — dispatches member invitation token", async () => {
    const res = await request(app)
      .post("/api/v1/partner/team/invite")
      .send({ email: "newmember@agency.com", role: "PARTNER_MEMBER" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("invitationToken");
  });

  it("GET /api/v1/partner/customers — returns customer CRM base", async () => {
    const res = await request(app).get("/api/v1/partner/customers");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("customers");
  });

  it("POST /api/v1/partner/customers — creates new customer contact", async () => {
    const res = await request(app)
      .post("/api/v1/partner/customers")
      .send({ firstName: "Alice", lastName: "Smith", email: `alice_${Date.now()}@example.com` });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  it("GET /api/v1/partner/gbp/extended — returns multi-location GBP data", async () => {
    const res = await request(app).get("/api/v1/partner/gbp/extended");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("locations");
  });

  it("GET /api/v1/partner/social/suite — returns 8-platform social channels", async () => {
    const res = await request(app).get("/api/v1/partner/social/suite");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("supportedPlatforms");
  });

  it("POST /api/v1/partner/ai/generate — executes AI Studio tool engine", async () => {
    const res = await request(app)
      .post("/api/v1/partner/ai/generate")
      .send({ type: "CONTENT", prompt: "Generate social caption" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("result");
  });

  it("GET /api/v1/partner/marketing/campaigns — returns marketing campaigns", async () => {
    const res = await request(app).get("/api/v1/partner/marketing/campaigns");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("campaigns");
  });

  it("GET /api/v1/partner/crm/pipelines — returns deal pipeline board", async () => {
    const res = await request(app).get("/api/v1/partner/crm/pipelines");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pipelines");
  });

  it("GET /api/v1/partner/calendar-tasks — returns events & tasks", async () => {
    const res = await request(app).get("/api/v1/partner/calendar-tasks");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("events");
  });

  it("GET /api/v1/partner/files — returns media asset vault files", async () => {
    const res = await request(app).get("/api/v1/partner/files");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("assets");
  });

  it("GET /api/v1/partner/reports — returns 11-suite enterprise reports", async () => {
    const res = await request(app).get("/api/v1/partner/reports?type=BUSINESS");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("suites");
  });

  it("GET /api/v1/partner/notifications/preferences — returns user channel preferences", async () => {
    const res = await request(app).get("/api/v1/partner/notifications/preferences");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("preferences");
  });

  it("GET /api/v1/partner/subscription — returns plan billing overview", async () => {
    const res = await request(app).get("/api/v1/partner/subscription");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("currentSubscription");
  });

  it("GET /api/v1/partner/global-search — searches across platform entities", async () => {
    const res = await request(app).get("/api/v1/partner/global-search?q=agency");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("results");
  });

  it("GET /api/v1/partner/workflows — returns automation rules & approvals", async () => {
    const res = await request(app).get("/api/v1/partner/workflows");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("automationRules");
  });
});
