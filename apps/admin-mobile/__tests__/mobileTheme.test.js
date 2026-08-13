const {
  THEME_MODES,
  createThemePreferenceStorage,
  nextThemeMode,
  parseThemePreference,
  resolveThemeMode,
} = require("../mobileTheme");

describe("Admin Mobile theme preferences", () => {
  it("supports system, light, and dark with deterministic cycling", () => {
    expect(THEME_MODES).toEqual(["system", "light", "dark"]);
    expect(nextThemeMode("system")).toBe("light");
    expect(nextThemeMode("light")).toBe("dark");
    expect(nextThemeMode("dark")).toBe("system");
  });

  it("follows the system only in system mode", () => {
    expect(resolveThemeMode("system", "dark")).toBe("dark");
    expect(resolveThemeMode("system", "unspecified")).toBe("light");
    expect(resolveThemeMode("dark", "light")).toBe("dark");
  });

  it("persists a versioned value and safely rejects stale or malformed data", async () => {
    const values = new Map();
    const storage = createThemePreferenceStorage({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => void values.set(key, value),
    });

    await storage.write("dark");
    expect(await storage.read()).toBe("dark");
    expect(parseThemePreference('{"version":2,"mode":"dark"}')).toBe("system");
    expect(parseThemePreference("not-json")).toBe("system");
  });
});
