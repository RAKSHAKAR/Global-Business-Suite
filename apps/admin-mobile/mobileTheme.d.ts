export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY: string;
export const THEME_MODES: ReadonlyArray<ThemeMode>;

export function isThemeMode(value: unknown): value is ThemeMode;
export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: string | null | undefined,
): ResolvedTheme;
export function nextThemeMode(mode: ThemeMode): ThemeMode;
export function serializeThemePreference(mode: ThemeMode): string;
export function parseThemePreference(value: string | null | undefined): ThemeMode;
export function createThemePreferenceStorage(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}): {
  read(): Promise<ThemeMode>;
  write(mode: ThemeMode): Promise<void>;
};
