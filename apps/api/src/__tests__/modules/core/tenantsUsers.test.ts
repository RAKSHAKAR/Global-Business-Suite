import request from "supertest";
import { app } from "../../../index";

describe("Tenants & Users API Automated Tests", () => {
  let authToken: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "admin@enterprise.com",
      password: "Admin@1234!",
    });
    authToken = res.body.data?.token || res.body.token;
  });

  it("GET /api/v1/tenants → 200 lists tenants with pagination envelope", async () => {
    const res = await request(app)
      .get("/api/v1/tenants")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty("pagination");
  });

  it("POST /api/v1/tenants → 201 creates a new tenant", async () => {
    const tenantName = `Automated Tenant ${Date.now()}`;
    const res = await request(app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: tenantName,
        subdomain: `test-sub-${Date.now()}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(tenantName);
  });

  it("GET /api/v1/users → 200 lists platform users", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
