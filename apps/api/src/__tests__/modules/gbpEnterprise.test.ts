import request from "supertest";
import app from "../../index";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";

describe("Phase 10 - Enterprise Google Business Profile (GBP) API Suite", () => {
  const tenantId = `gbp-hardening-${Date.now()}`;
  const token = jwt.sign(
    { userId: "test-admin-id", email: "admin@enterprise.com", role: "SUPER_ADMIN", tenantId },
    JWT_SECRET,
  );

  test("GET /api/v1/gbp/locations should return list of tenant locations", async () => {
    const res = await request(app)
      .get("/api/v1/gbp/locations")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("GET /api/v1/gbp/accounts should list connected Google accounts", async () => {
    const res = await request(app)
      .get("/api/v1/gbp/accounts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("POST /api/v1/gbp/accounts rejects fabricated/manual account connections", async () => {
    const res = await request(app)
      .post("/api/v1/gbp/accounts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        accountName: "Test Enterprise GBP Account",
        googleAccountId: `accounts/test-${Date.now()}`,
        email: "gbp@enterprise.com",
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      code: "GOOGLE_OAUTH_REQUIRED",
      next: "/api/v1/google/auth",
    });
  });

  test("POST /api/v1/gbp/ai/post-writer should generate AI post content", async () => {
    const res = await request(app)
      .post("/api/v1/gbp/ai/post-writer")
      .set("Authorization", `Bearer ${token}`)
      .send({
        businessName: "Acme Gourmet Bistro",
        category: "Restaurant",
        topicType: "OFFER",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("summary");
    expect(res.body.data).toHaveProperty("suggestedHashtags");
    expect(res.body.data).toHaveProperty("callToAction");
  });

  test("POST /api/v1/gbp/ai/seo-suggestions should generate local SEO recommendations", async () => {
    const res = await request(app)
      .post("/api/v1/gbp/ai/seo-suggestions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Apex Fitness Studio",
        category: "Gym",
        address: "New York, NY",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("recommendedTitle");
    expect(res.body.data.suggestedKeywords.length).toBeGreaterThan(0);
  });

  test("POST /api/v1/gbp/bulk/posts should reject request without required fields", async () => {
    const res = await request(app)
      .post("/api/v1/gbp/bulk/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ locationIds: [] });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /api/v1/gbp/multi-location/summary should return aggregated location stats", async () => {
    const res = await request(app)
      .get("/api/v1/gbp/multi-location/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("locations");
    expect(res.body).toHaveProperty("totals");
  });

  test("POST /api/v1/gbp/sync reports that an OAuth connection is required", async () => {
    const res = await request(app)
      .post("/api/v1/gbp/sync")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      success: false,
      code: "GOOGLE_BUSINESS_NOT_CONNECTED",
    });
  });

  test("GET /api/v1/gbp/locations/:id/insights never fabricates data for an unknown tenant location", async () => {
    const res = await request(app)
      .get("/api/v1/gbp/locations/not-a-real-location/insights")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Location not found" });
  });

  test("POST /api/v1/gbp/ai/recommendations never uses fallback metrics for an unknown tenant location", async () => {
    const res = await request(app)
      .post("/api/v1/gbp/ai/recommendations")
      .set("Authorization", `Bearer ${token}`)
      .send({ locationId: "not-a-real-location" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Location not found" });
  });

  test("GET /api/v1/gbp/templates/posts should list post templates", async () => {
    const res = await request(app)
      .get("/api/v1/gbp/templates/posts")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
  });

  test("GET /api/v1/gbp/templates/replies should list reply templates", async () => {
    const res = await request(app)
      .get("/api/v1/gbp/templates/replies")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
  });
});
