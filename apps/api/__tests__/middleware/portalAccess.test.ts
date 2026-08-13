import { NextFunction, Request, Response } from "express";
import { requirePortalAccess, normalizeRoleName } from "../../src/middleware/portalAccess";

jest.mock("@saas/database", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

const { prisma } = require("@saas/database");

function account(roleName: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "authoritative-user-id",
    email: "role-user@example.com",
    tenantId: "authoritative-tenant-id",
    isActive: true,
    isDeleted: false,
    isSuspended: false,
    approvalStatus: "APPROVED",
    roles: [
      {
        role: {
          name: roleName,
          isSystem: roleName === "Super Admin",
          tenantId: roleName === "Super Admin" ? null : "authoritative-tenant-id",
        },
      },
    ],
    ...overrides,
  };
}

function responseDouble(): Response {
  const response: Partial<Response> = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response as Response;
}

async function invoke(portal: "PARTNER" | "CUSTOMER", dbAccount: ReturnType<typeof account>) {
  prisma.user.findUnique.mockResolvedValue(dbAccount);
  const request = {
    user: {
      userId: "authoritative-user-id",
      email: "forged-token@example.com",
      tenantId: "forged-tenant-id",
      roles: [{ role: { name: portal === "PARTNER" ? "Customer" : "Partner" } }],
    },
  } as unknown as Request;
  const response = responseDouble();
  const next = jest.fn() as NextFunction;

  await requirePortalAccess(portal)(request, response, next);
  return { request: request as any, response, next };
}

describe("authoritative portal role boundary", () => {
  const originalSuperAdminPolicy = process.env.ALLOW_SUPER_ADMIN_PORTAL_ACCESS;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ALLOW_SUPER_ADMIN_PORTAL_ACCESS;
  });

  afterAll(() => {
    if (originalSuperAdminPolicy === undefined) {
      delete process.env.ALLOW_SUPER_ADMIN_PORTAL_ACCESS;
    } else {
      process.env.ALLOW_SUPER_ADMIN_PORTAL_ACCESS = originalSuperAdminPolicy;
    }
  });

  it("normalizes supported legacy role spellings deterministically", () => {
    expect(normalizeRoleName(" Partner_Admin ")).toBe("partneradmin");
    expect(normalizeRoleName("Customer User")).toBe("customeruser");
  });

  it("allows a seeded Partner and replaces forged JWT tenant data", async () => {
    const { request, next } = await invoke("PARTNER", account("Partner"));

    expect(next).toHaveBeenCalledTimes(1);
    expect(request.user.tenantId).toBe("authoritative-tenant-id");
    expect(request.user.email).toBe("role-user@example.com");
  });

  it("allows a seeded Customer on the Customer portal", async () => {
    const { next } = await invoke("CUSTOMER", account("Customer"));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["CUSTOMER", "Partner"],
    ["PARTNER", "Customer"],
  ] as const)("denies %s portal use by a %s role", async (portal, roleName) => {
    const { response, next } = await invoke(portal, account(roleName));

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "PORTAL_ROLE_DENIED", requiredPortal: portal }),
    );
  });

  it("does not treat a role claim inside the JWT as authorization", async () => {
    const { response, next } = await invoke("PARTNER", account("Customer"));

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it("only permits Super Admin cross-portal access under an explicit server policy", async () => {
    const denied = await invoke("PARTNER", account("Super Admin"));
    expect(denied.next).not.toHaveBeenCalled();
    expect(denied.response.status).toHaveBeenCalledWith(403);

    process.env.ALLOW_SUPER_ADMIN_PORTAL_ACCESS = "true";
    const allowed = await invoke(
      "PARTNER",
      account("Super Admin", { tenantId: "authoritative-tenant-id" }),
    );
    expect(allowed.next).toHaveBeenCalledTimes(1);
  });

  it("does not treat a tenant-scoped role named Super Admin as a global administrator", async () => {
    process.env.ALLOW_SUPER_ADMIN_PORTAL_ACCESS = "true";
    const spoofedSuperAdmin = account("Super Admin");
    spoofedSuperAdmin.roles[0].role.isSystem = false;
    spoofedSuperAdmin.roles[0].role.tenantId = "authoritative-tenant-id";

    const { response, next } = await invoke("PARTNER", spoofedSuperAdmin);
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it("rejects stale tokens for disabled authoritative accounts", async () => {
    const { response, next } = await invoke(
      "CUSTOMER",
      account("Customer", { isActive: false }),
    );

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "ACCOUNT_ACCESS_RESTRICTED" }),
    );
  });
});
