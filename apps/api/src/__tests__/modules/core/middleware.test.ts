import request from "supertest";
import { app } from "../../../index";
import { clearIdempotencyCache } from "../../../middleware/idempotency";
import { prisma } from "@saas/database";

describe("Enterprise Middleware & Health Automated Tests", () => {
  let authToken: string;
  let validTenantId: string;

  beforeAll(async () => {
    clearIdempotencyCache();
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "admin@enterprise.com",
      password: "Admin@1234!",
    });
    authToken = res.body.data?.token || res.body.token;

    const tenant = await prisma.tenant.findFirst();
    if (tenant) {
      validTenantId = tenant.id;
    } else {
      const created = await prisma.tenant.create({
        data: { name: "Test Middleware Tenant" },
      });
      validTenantId = created.id;
    }
  });

  it("RequestId Middleware → Returns X-Request-ID response header and attaches to meta", async () => {
    const customReqId = `custom-req-${Date.now()}`;
    const res = await request(app)
      .get("/health")
      .set("X-Request-ID", customReqId);

    expect(res.headers["x-request-id"]).toBe(customReqId);
  });

  it("GET /health → 200 returns comprehensive subsystem diagnostics", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("subsystems");
    expect(res.body.subsystems.database).toBe("connected");
  });

  it("Idempotency Middleware → Caches and returns identical payload for duplicate POST with x-idempotency-key", async () => {
    const idempotencyKey = `idemp-key-${Date.now()}`;
    const payload = {
      content: `Idempotent post test ${Date.now()}`,
      platform: "LINKEDIN",
      tenantId: validTenantId,
    };

    const res1 = await request(app)
      .post("/api/v1/social-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .set("X-Idempotency-Key", idempotencyKey)
      .send(payload);

    expect(res1.status).toBe(201);
    const firstPostId = res1.body.data?.id;

    const res2 = await request(app)
      .post("/api/v1/social-posts")
      .set("Authorization", `Bearer ${authToken}`)
      .set("X-Idempotency-Key", idempotencyKey)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.headers["x-cache-lookup"]).toBe("HIT");
    expect(res2.body.data?.id).toBe(firstPostId);
  });
});
