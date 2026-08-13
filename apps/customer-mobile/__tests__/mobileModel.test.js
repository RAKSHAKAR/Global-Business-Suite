const {
  CUSTOMER_TABS,
  BIOMETRIC_AUTH_AVAILABLE,
  authenticateWithPassword,
  verifyPortalAccess,
  resolveServiceUrl,
} = require("../mobileModel");

describe("Customer Mobile authentication and navigation", () => {
  it("starts from a credential-gated model and rejects failed HTTP responses", async () => {
    const result = await authenticateWithPassword({
      email: "customer@demo.com",
      password: "wrong-password",
      endpoint: "http://localhost:4000/api/v1/auth/login",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Invalid credentials" }),
      }),
    });

    expect(result).toEqual({ ok: false, error: "Invalid credentials" });
    expect(BIOMETRIC_AUTH_AVAILABLE).toBe(false);
  });

  it("accepts only a successful response containing a non-empty token", async () => {
    const result = await authenticateWithPassword({
      email: "customer@demo.com",
      password: "secret",
      endpoint: "http://localhost:4000/api/v1/auth/login",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { token: "customer-token", user: { id: "c1" } } }),
      }),
    });

    expect(result).toEqual({ ok: true, token: "customer-token", user: { id: "c1" } });
  });

  it("keeps Messages and all other customer tabs uniquely reachable", () => {
    expect(new Set(CUSTOMER_TABS).size).toBe(CUSTOMER_TABS.length);
    expect(CUSTOMER_TABS).toContain("MESSAGES");
    expect(CUSTOMER_TABS).toEqual(expect.arrayContaining(["APPOINTMENTS", "AI_TOOLS", "CALL_REQUESTS"]));
  });

  it("resolves web, Android emulator, and configured portal URLs", () => {
    expect(resolveServiceUrl({ platform: "web", port: 3002 })).toBe("http://localhost:3002");
    expect(resolveServiceUrl({ platform: "android", port: 3002 })).toBe("http://10.0.2.2:3002");
    expect(
      resolveServiceUrl({ configuredUrl: "https://customer.example.com/", platform: "android", port: 3002 }),
    ).toBe("https://customer.example.com");
  });

  it("requires an approved Customer role from the authenticated profile", async () => {
    const accepted = await verifyPortalAccess({
      token: "customer-token",
      endpoint: "http://localhost:4000/api/v1/auth/me",
      expectedRoles: ["CUSTOMER"],
      portalName: "GBS Customer Mobile",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { approvalStatus: "APPROVED", roles: [{ role: { name: "Customer" } }] } }),
      }),
    });
    const rejected = await verifyPortalAccess({
      token: "admin-token",
      endpoint: "http://localhost:4000/api/v1/auth/me",
      expectedRoles: ["CUSTOMER"],
      portalName: "GBS Customer Mobile",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { roles: [{ role: { name: "Super Admin" } }] } }),
      }),
    });

    expect(accepted.ok).toBe(true);
    expect(accepted.roles).toEqual(["CUSTOMER"]);
    expect(rejected).toEqual({
      ok: false,
      error: "This account does not have access to GBS Customer Mobile.",
    });
  });
});
