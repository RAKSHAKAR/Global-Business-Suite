const {
  THEME_MODES,
  createThemePreferenceStorage,
  nextThemeMode,
  parseThemePreference,
  resolveThemeMode,
} = require("../mobileTheme");

describe("Partner Mobile theme preferences", () => {
  it("supports and cycles all three modes", () => {
    expect(THEME_MODES).toEqual(["system", "light", "dark"]);
    expect([nextThemeMode("system"), nextThemeMode("light"), nextThemeMode("dark")]).toEqual([
      "light",
      "dark",
      "system",
    ]);
  });

  it("resolves explicit and system modes", () => {
    expect(resolveThemeMode("system", "dark")).toBe("dark");
    expect(resolveThemeMode("light", "dark")).toBe("light");
  });

  it("round-trips a versioned stored preference", async () => {
    let stored = null;
    const storage = createThemePreferenceStorage({
      getItem: async () => stored,
      setItem: async (_key, value) => {
        stored = value;
      },
    });
    await storage.write("light");
    expect(await storage.read()).toBe("light");
    expect(parseThemePreference('{"version":1,"mode":"sepia"}')).toBe("system");
  });
});
