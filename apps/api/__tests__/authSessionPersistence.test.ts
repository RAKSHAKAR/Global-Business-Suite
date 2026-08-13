/**
 * GBS Enterprise — Auth Session Persistence & Response Unwrapping Test Suite
 *
 * Verifies:
 * 1. Login endpoints return standard payload `{ success: true, data: { token, user } }`.
 * 2. Unwrapping `data.data || data` extracts valid JWT token and user info across all portals.
 * 3. Subsequent calls to `/api/v1/auth/me` with `Authorization: Bearer <token>` return `{ success: true, data: { ... } }` with compiled permissions.
 * 4. Stored tokens are not `"undefined"` or `"null"` strings, ensuring session persistence.
 */

import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/index";
import { JWT_SECRET } from "../src/config/jwt";

jest.mock("@saas/database", () => {
  const innerMock = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: { deleteMany: jest.fn() },
    loginHistory: { create: jest.fn() },
    subscription: { findFirst: jest.fn() },
    platformSetting: { findUnique: jest.fn() },
    aiProvider: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return {
    prisma: innerMock,
    PrismaClient: jest.fn().mockImplementation(() => innerMock),
  };
});

const { prisma } = require("@saas/database");

describe("Auth Session Persistence & Response Unwrapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Login endpoint returns wrapped payload { success: true, data: { token, user } }", async () => {
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash("AdminPassword123!", 1);

    prisma.user.findUnique.mockResolvedValue({
      id: "admin-user-id",
      email: "admin@enterprise.com",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      tenantId: "tenant-admin-123",
      isActive: true,
      approvalStatus: "APPROVED",
      isSuspended: false,
    });
    prisma.subscription.findFirst.mockResolvedValue({ status: "ACTIVE" });
    prisma.loginHistory.create.mockResolvedValue({});

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@enterprise.com", password: "AdminPassword123!" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Key requirement: token and user are inside res.body.data
    const payload = res.body.data || res.body;
    expect(payload.token).toBeDefined();
    expect(typeof payload.token).toBe("string");
    expect(payload.token).not.toBe("undefined");
    expect(payload.user).toBeDefined();
    expect(payload.user.email).toBe("admin@enterprise.com");
  });

  test("2. Unwrapped token can be decoded and verified against JWT_SECRET", async () => {
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash("PartnerPass123!", 1);

    prisma.user.findUnique.mockResolvedValue({
      id: "partner-user-id",
      email: "partner@tenant.com",
      passwordHash,
      firstName: "Partner",
      lastName: "Agency",
      tenantId: "tenant-partner-456",
      isActive: true,
      approvalStatus: "APPROVED",
      isSuspended: false,
    });
    prisma.subscription.findFirst.mockResolvedValue({ status: "ACTIVE" });
    prisma.loginHistory.create.mockResolvedValue({});

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "partner@tenant.com", password: "PartnerPass123!" });

    expect(res.status).toBe(200);
    const payload = res.body.data || res.body;
    const token = payload.token;

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    expect(decoded.userId).toBe("partner-user-id");
    expect(decoded.email).toBe("partner@tenant.com");
    expect(decoded.tenantId).toBe("tenant-partner-456");
  });

  test("3. /api/v1/auth/me returns user profile and compiled permissions inside data wrapper", async () => {
    const validToken = jwt.sign(
      { userId: "customer-user-id", email: "customer@demo.com", tenantId: "tenant-cust-789" },
      JWT_SECRET,
      { expiresIn: "1h" },
    );

    prisma.user.findUnique.mockResolvedValue({
      id: "customer-user-id",
      email: "customer@demo.com",
      firstName: "Customer",
      lastName: "User",
      tenantId: "tenant-cust-789",
      tenant: { id: "tenant-cust-789", name: "Demo Tenant" },
      roles: [
        {
          role: {
            name: "CUSTOMER",
            permissions: [
              { permission: { resource: "dashboard", action: "read" } },
              { permission: { resource: "orders", action: "create" } },
            ],
          },
        },
      ],
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Frontend unwrapping test
    const userData = res.body.data || res.body;
    expect(userData.id).toBe("customer-user-id");
    expect(userData.email).toBe("customer@demo.com");
    expect(Array.isArray(userData.compiledPermissions)).toBe(true);
    expect(userData.compiledPermissions).toContain("dashboard:read");
    expect(userData.compiledPermissions).toContain("orders:create");
  });

  test("4. Invalid or string 'undefined' tokens are rejected by /api/v1/auth/me", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer undefined");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
