import request from "supertest";
import app from "../../index";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";

describe("Phase 8 - Global Search API Endpoint", () => {
  const token = jwt.sign(
    { id: "test-user-id", email: "test@gbs.com", role: "ADMIN", tenantId: "tenant-1" },
    JWT_SECRET,
  );

  test("GET /api/v1/search should return 400 if 'q' parameter is missing", async () => {
    const res = await request(app)
      .get("/api/v1/search")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("GET /api/v1/search should return paginated search results with meta", async () => {
    const res = await request(app)
      .get("/api/v1/search?q=test&type=all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("meta");
  });
});
