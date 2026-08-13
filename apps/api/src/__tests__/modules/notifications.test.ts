import request from "supertest";
import app from "../../index";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";

describe("Phase 8 - Notifications API Endpoint", () => {
  const token = jwt.sign(
    { id: "test-user-id", email: "test@gbs.com", role: "ADMIN", tenantId: "tenant-1" },
    JWT_SECRET,
  );

  test("POST /api/v1/notifications/send should validate missing body parameters", async () => {
    const res = await request(app)
      .post("/api/v1/notifications/send")
      .set("Authorization", `Bearer ${token}`)
      .send({ recipient: "user@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /api/v1/notifications/send should successfully dispatch notification payload", async () => {
    const res = await request(app)
      .post("/api/v1/notifications/send")
      .set("Authorization", `Bearer ${token}`)
      .send({
        recipient: "user@example.com",
        channel: "EMAIL",
        title: "Test System Notification",
        body: "This is a test notification body from Phase 8 API.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.channel).toBe("EMAIL");
  });

  test("GET /api/v1/notifications/preferences should return user channel preferences", async () => {
    const res = await request(app)
      .get("/api/v1/notifications/preferences")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("emailNotifications");
  });
});
