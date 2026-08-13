import request from "supertest";
import { app } from "../../../index";
import { prisma } from "@saas/database";
import bcrypt from "bcryptjs";

let adminToken: string = "";
let partnerToken: string = "";
let testTenantId: string = "";
let testUserId: string = "";
let testRoleId: string = "";
let testClientId: string = "";
let testPostId: string = "";

const ADMIN_EMAIL = `admin_test_${Date.now()}@example.com`;
const ADMIN_PASS = "Admin@1234!";

const PARTNER_EMAIL = `partner_test_${Date.now()}@example.com`;
const PARTNER_PASS = "Partner@1234!";

beforeAll(async () => {
  await prisma.loginHistory.deleteMany({});
  await prisma.auditLog.deleteMany({});
});

afterAll(async () => {
  if (testClientId) await prisma.client.deleteMany({ where: { id: testClientId } }).catch(() => {});
  if (testPostId) await prisma.socialPost.deleteMany({ where: { id: testPostId } }).catch(() => {});
  if (testUserId) await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
  if (testRoleId) await prisma.role.deleteMany({ where: { id: testRoleId } }).catch(() => {});
  if (testTenantId) await prisma.tenant.deleteMany({ where: { id: testTenantId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, PARTNER_EMAIL] } } }).catch(() => {});
  await prisma.$disconnect();
});

describe("Health & Info", () => {
  it("GET / → returns service info", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("service");
    expect(res.body.status).toBe("running");
  });

  it("GET /health → database connected", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
  });
});

describe("Auth — /api/v1/auth", () => {
  it("POST /register → 400 if missing fields", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({ email: "bad@test.com" });
    expect(res.status).toBe(400);
  });

  it("POST /register → 201 creates admin user", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
      firstName: "Admin",
      lastName: "Test",
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("userId");
  });

  it("POST /login → 200 returns JWT token", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASS });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("token");
    adminToken = res.body.data.token;
  });
});

describe("Tenants — /api/v1/tenants", () => {
  it("POST /tenants → 201 creates tenant", async () => {
    const res = await request(app)
      .post("/api/v1/tenants")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: `Test Tenant ${Date.now()}`, primaryColor: "#FF6B00" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    testTenantId = res.body.id;
  });

  it("GET /tenants → 200 returns paginated list", async () => {
    const res = await request(app)
      .get("/api/v1/tenants?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
