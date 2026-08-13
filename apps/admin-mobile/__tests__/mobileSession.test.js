const {
  SESSION_STORAGE_KEY,
  createSessionStorage,
  parseSession,
} = require("../mobileSession");

describe("Admin Mobile session persistence", () => {
  it("stores only the versioned token, roles, and allow-listed user fields", async () => {
    const values = new Map();
    const storage = createSessionStorage({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => values.set(key, value),
      removeItem: async (key) => values.delete(key),
    });

    await storage.write({
      token: "verified-token",
      roles: ["SUPER_ADMIN"],
      user: { id: "a1", email: "admin@enterprise.com", passwordHash: "must-not-persist" },
    });

    expect(SESSION_STORAGE_KEY).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(await storage.read()).toEqual({
      token: "verified-token",
      roles: ["SUPER_ADMIN"],
      user: { id: "a1", email: "admin@enterprise.com" },
    });
    expect(values.get(SESSION_STORAGE_KEY)).not.toContain("passwordHash");
    await storage.clear();
    expect(await storage.read()).toBeNull();
  });

  it("rejects corrupt, tokenless, and unknown-version sessions", () => {
    expect(parseSession("not-json")).toBeNull();
    expect(parseSession(JSON.stringify({ version: 1, token: "", roles: [] }))).toBeNull();
    expect(parseSession(JSON.stringify({ version: 2, token: "token", roles: [] }))).toBeNull();
  });
});
