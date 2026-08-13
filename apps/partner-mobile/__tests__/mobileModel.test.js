const {
  PARTNER_PUBLIC_ROUTES,
  PARTNER_TABS,
  BIOMETRIC_AUTH_AVAILABLE,
  authenticateWithPassword,
  verifyPortalAccess,
  resolveServiceUrl,
} = require("../mobileModel");

describe("Partner Mobile authentication and navigation", () => {
  it("does not authenticate after rejected credentials", async () => {
    const result = await authenticateWithPassword({
      email: "partner@demo.com",
      password: "wrong-password",
      endpoint: "http://localhost:4000/api/v1/auth/login",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ data: { message: "Invalid email or password." } }),
      }),
    });

    expect(result).toEqual({ ok: false, error: "Invalid email or password." });
  });

  it("requires a real API token before granting access", async () => {
    const result = await authenticateWithPassword({
      email: "partner@demo.com",
      password: "secret",
      endpoint: "http://localhost:4000/api/v1/auth/login",
      fetchImpl: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { id: "p1" } }) }),
    });
    expect(result.ok).toBe(false);
  });

  it("keeps registration and every operational tab reachable", () => {
    const ids = PARTNER_TABS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["SOCIAL", "UNIFIED_INBOX", "CALL_CENTER", "SETTINGS"]));
    expect(PARTNER_PUBLIC_ROUTES).toContain("/register");
    expect(
      resolveServiceUrl({
        configuredUrl: "http://localhost:3001/",
        platform: "web",
        port: 3001,
        path: "/register",
      }),
    ).toBe("http://localhost:3001/register");
    expect(BIOMETRIC_AUTH_AVAILABLE).toBe(false);
  });

  it("allows an approved Partner profile and rejects an inactive profile", async () => {
    const approved = await verifyPortalAccess({
      token: "partner-token",
      endpoint: "http://localhost:4000/api/v1/auth/me",
      expectedRoles: ["PARTNER", "PARTNER_ADMIN"],
      portalName: "GBS Partner Mobile",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { approvalStatus: "APPROVED", roles: [{ role: { name: "Partner" } }] } }),
      }),
    });
    const inactive = await verifyPortalAccess({
      token: "inactive-token",
      endpoint: "http://localhost:4000/api/v1/auth/me",
      expectedRoles: ["PARTNER"],
      portalName: "GBS Partner Mobile",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { isSuspended: true, roles: ["PARTNER"] } }),
      }),
    });

    expect(approved.ok).toBe(true);
    expect(approved.roles).toContain("PARTNER");
    expect(inactive).toEqual({ ok: false, error: "This account is not active." });
  });

  it("does not accept a customer role in the partner app", async () => {
    const result = await verifyPortalAccess({
      token: "customer-token",
      endpoint: "http://localhost:4000/api/v1/auth/me",
      expectedRoles: ["PARTNER"],
      portalName: "GBS Partner Mobile",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { roles: [{ role: { name: "Customer" } }] } }),
      }),
    });
    expect(result.ok).toBe(false);
  });
});
