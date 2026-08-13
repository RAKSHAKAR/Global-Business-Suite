import request from "supertest";
import { app } from "../../../index";

describe("Auth Module Automated API Tests", () => {
  let createdUserEmail: string;

  beforeAll(() => {
    createdUserEmail = `testuser_${Date.now()}@enterprise.com`;
  });

  it("GET /api/v1/auth/captcha → 200 returns valid CAPTCHA payload", async () => {
    const res = await request(app).get("/api/v1/auth/captcha");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data).toHaveProperty("image");
  });

  it("POST /api/v1/auth/register → 201 creates user successfully", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: createdUserEmail,
      password: "TestPassword123!",
      firstName: "Unit",
      lastName: "Tester",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("userId");
  });

  it("POST /api/v1/auth/register → 403 blocks self-registration of ADMIN role", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: `admin_${Date.now()}@enterprise.com`,
      password: "TestPassword123!",
      role: "ADMIN",
    });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/auth/login → 200 returns JWT token for valid credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "admin@enterprise.com",
      password: "Admin@1234!",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data.user).toHaveProperty("email", "admin@enterprise.com");
  });

  it("POST /api/v1/auth/login → 401 fails with wrong password", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "admin@enterprise.com",
      password: "WrongPassword!",
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/auth/forgot-password → 200 handles email reset safely", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({
      email: "admin@enterprise.com",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
