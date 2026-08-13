const { SESSION_STORAGE_KEY, createSessionStorage, parseSession } = require("../mobileSession");

describe("Partner Mobile session persistence", () => {
  it("persists a sanitized session and clears it on logout", async () => {
    const values = new Map();
    const storage = createSessionStorage({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
      removeItem: async (key) => values.delete(key),
    });
    await storage.write({
      token: "verified-token",
      roles: ["PARTNER"],
      user: { id: "p1", email: "partner@demo.com", compiledPermissions: ["unsafe-copy"] },
    });
    expect(SESSION_STORAGE_KEY).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(await storage.read()).toEqual({
      token: "verified-token",
      roles: ["PARTNER"],
      user: { id: "p1", email: "partner@demo.com" },
    });
    await storage.clear();
    expect(await storage.read()).toBeNull();
  });

  it("rejects malformed stored sessions", () => {
    expect(parseSession("{broken")).toBeNull();
    expect(parseSession(JSON.stringify({ version: 1, token: "token", roles: [7] }))).toBeNull();
  });
});
