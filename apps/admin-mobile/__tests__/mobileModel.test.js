const {
  ADMIN_TABS,
  BIOMETRIC_AUTH_AVAILABLE,
  BIOMETRIC_UNAVAILABLE_MESSAGE,
  authenticateWithPassword,
  verifyPortalAccess,
  resolveServiceUrl,
} = require("../mobileModel");

describe("Admin Mobile authentication and navigation", () => {
  it("does not authenticate when the API rejects the credentials", async () => {
    const result = await authenticateWithPassword({
      email: "admin@enterprise.com",
      password: "wrong-password",
      endpoint: "http://localhost:4000/api/v1/auth/login",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Invalid credentials" }),
      }),
    });

    expect(result).toEqual({ ok: false, error: "Invalid credentials" });
  });

  it("does not authenticate on network failure or a tokenless success response", async () => {
    const networkFailure = await authenticateWithPassword({
      email: "admin@enterprise.com",
      password: "secret",
      endpoint: "http://localhost:4000/api/v1/auth/login",
      fetchImpl: jest.fn().mockRejectedValue(new Error("offline")),
    });
    const tokenlessResponse = await authenticateWithPassword({
      email: "admin@enterprise.com",
      password: "secret",
      endpoint: "http://localhost:4000/api/v1/auth/login",
      fetchImpl: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) }),
    });

    expect(networkFailure.ok).toBe(false);
    expect(tokenlessResponse).toEqual({
      ok: false,
      error: "Authentication response did not include a valid session token.",
    });
  });

  it("exposes unique, reachable admin tabs without advertising biometrics", () => {
    const ids = ADMIN_TABS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["DASHBOARD", "RBAC", "ECOSYSTEM", "SETTINGS"]));
    expect(BIOMETRIC_AUTH_AVAILABLE).toBe(false);
    expect(BIOMETRIC_UNAVAILABLE_MESSAGE).toContain("not configured");
  });

  it("uses platform-correct local URLs and respects explicit environment URLs", () => {
    expect(resolveServiceUrl({ platform: "web", port: 3000 })).toBe("http://localhost:3000");
    expect(resolveServiceUrl({ platform: "android", port: 4000, path: "/api/v1/auth/login" })).toBe(
      "http://10.0.2.2:4000/api/v1/auth/login",
    );
    expect(
      resolveServiceUrl({ configuredUrl: "https://admin.example.com/", platform: "ios", port: 3000 }),
    ).toBe("https://admin.example.com");
  });

  it("verifies the authoritative profile role before granting admin access", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { approvalStatus: "APPROVED", roles: [{ role: { name: "Super Admin" } }] },
      }),
    });
    const result = await verifyPortalAccess({
      token: "admin-token",
      endpoint: "http://localhost:4000/api/v1/auth/me",
      expectedRoles: ["SUPER_ADMIN"],
      portalName: "GBS Admin Mobile",
      fetchImpl,
    });

    expect(result.ok).toBe(true);
    expect(result.roles).toContain("SUPER_ADMIN");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/auth/me",
      { headers: { Authorization: "Bearer admin-token" } },
    );
  });

  it("fails closed for a valid token belonging to the wrong portal role", async () => {
    const result = await verifyPortalAccess({
      token: "partner-token",
      endpoint: "http://localhost:4000/api/v1/auth/me",
      expectedRoles: ["SUPER_ADMIN", "ADMIN"],
      portalName: "GBS Admin Mobile",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { roles: [{ role: { name: "Partner" } }] } }),
      }),
    });

    expect(result).toEqual({
      ok: false,
      error: "This account does not have access to GBS Admin Mobile.",
    });
  });
});
