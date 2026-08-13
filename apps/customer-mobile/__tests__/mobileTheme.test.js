const {
  THEME_MODES,
  createThemePreferenceStorage,
  nextThemeMode,
  parseThemePreference,
  resolveThemeMode,
} = require("../mobileTheme");

describe("Customer Mobile theme preferences", () => {
  it("supports system, light, and dark and cycles back to system", () => {
    expect(THEME_MODES).toEqual(["system", "light", "dark"]);
    expect(nextThemeMode("system")).toBe("light");
    expect(nextThemeMode("light")).toBe("dark");
    expect(nextThemeMode("dark")).toBe("system");
  });

  it("uses live system appearance without overriding explicit preferences", () => {
    expect(resolveThemeMode("system", "dark")).toBe("dark");
    expect(resolveThemeMode("system", "light")).toBe("light");
    expect(resolveThemeMode("dark", "light")).toBe("dark");
  });

  it("persists valid preferences and falls back safely for corrupt data", async () => {
    const values = {};
    const storage = createThemePreferenceStorage({
      getItem: async (key) => values[key] ?? null,
      setItem: async (key, value) => {
        values[key] = value;
      },
    });
    await storage.write("dark");
    expect(await storage.read()).toBe("dark");
    expect(parseThemePreference("{")).toBe("system");
  });
});
