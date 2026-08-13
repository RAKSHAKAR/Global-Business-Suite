const { SESSION_STORAGE_KEY, createSessionStorage, parseSession } = require("../mobileSession");

describe("Customer Mobile session persistence", () => {
  it("persists a sanitized verified session and removes it", async () => {
    const values = new Map();
    const storage = createSessionStorage({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
      removeItem: async (key) => values.delete(key),
    });
    await storage.write({
      token: "verified-token",
      roles: ["CUSTOMER"],
      user: { id: "c1", email: "customer@demo.com", tenantId: "t1", secret: "must-not-persist" },
    });
    expect(SESSION_STORAGE_KEY).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(await storage.read()).toEqual({
      token: "verified-token",
      roles: ["CUSTOMER"],
      user: { id: "c1", email: "customer@demo.com", tenantId: "t1" },
    });
    await storage.clear();
    expect(await storage.read()).toBeNull();
  });

  it("rejects invalid schema versions and role data", () => {
    expect(parseSession(JSON.stringify({ version: 0, token: "token", roles: [] }))).toBeNull();
    expect(parseSession(JSON.stringify({ version: 1, token: "token", roles: null }))).toBeNull();
  });
});
