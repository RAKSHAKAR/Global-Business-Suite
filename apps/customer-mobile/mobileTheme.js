const THEME_STORAGE_KEY = "gbs.mobile.theme:v1";
const THEME_MODES = Object.freeze(["system", "light", "dark"]);

function isThemeMode(value) {
  return THEME_MODES.includes(value);
}

function resolveThemeMode(mode, systemScheme) {
  if (mode === "dark" || mode === "light") return mode;
  return systemScheme === "dark" ? "dark" : "light";
}

function nextThemeMode(mode) {
  const index = THEME_MODES.indexOf(mode);
  return THEME_MODES[(index + 1) % THEME_MODES.length];
}

function serializeThemePreference(mode) {
  return JSON.stringify({ version: 1, mode: isThemeMode(mode) ? mode : "system" });
}

function parseThemePreference(value) {
  if (!value) return "system";
  try {
    const parsed = JSON.parse(value);
    return parsed?.version === 1 && isThemeMode(parsed.mode) ? parsed.mode : "system";
  } catch {
    return "system";
  }
}

function createThemePreferenceStorage(storage) {
  return {
    async read() {
      return parseThemePreference(await storage.getItem(THEME_STORAGE_KEY));
    },
    async write(mode) {
      await storage.setItem(THEME_STORAGE_KEY, serializeThemePreference(mode));
    },
  };
}

module.exports = {
  THEME_STORAGE_KEY,
  THEME_MODES,
  isThemeMode,
  resolveThemeMode,
  nextThemeMode,
  serializeThemePreference,
  parseThemePreference,
  createThemePreferenceStorage,
};
