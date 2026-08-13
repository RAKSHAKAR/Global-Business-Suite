"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY } from "./theme-config";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_CHANGE_EVENT = "gbs-partner-theme-change";
const SERVER_SNAPSHOT = "system:light";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) return "system";
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "mode" in parsed &&
      isThemeMode((parsed as { mode: unknown }).mode)
    ) {
      return (parsed as { mode: ThemeMode }).mode;
    }
  } catch {
    // Storage can be unavailable in private browsing or hardened browsers.
  }
  return "system";
}

function writeStoredMode(mode: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode }));
  } catch {
    // The preference still applies for the current session when storage fails.
  }
}

function applyTheme(mode: ThemeMode, systemPrefersDark: boolean) {
  const resolvedTheme: ResolvedTheme =
    mode === "system" ? (systemPrefersDark ? "dark" : "light") : mode;
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = mode;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
}

function getThemeSnapshot() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return SERVER_SNAPSHOT;
  }
  const root = document.documentElement;
  const rootMode = root.dataset.themePreference;
  const mode = isThemeMode(rootMode) ? rootMode : readStoredMode();
  const rootTheme = root.dataset.theme;
  const resolvedTheme: ResolvedTheme =
    rootTheme === "light" || rootTheme === "dark"
      ? rootTheme
      : mode === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode;
  return `${mode}:${resolvedTheme}`;
}

function subscribeToTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme(readStoredMode(), media.matches);

  const handleThemeChange = () => onStoreChange();
  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    const mode = readStoredMode();
    if (mode === "system") applyTheme(mode, event.matches);
    onStoreChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readStoredMode(), media.matches);
    onStoreChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  window.addEventListener("storage", handleStorage);
  media.addEventListener("change", handleSystemThemeChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.removeEventListener("storage", handleStorage);
    media.removeEventListener("change", handleSystemThemeChange);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => SERVER_SNAPSHOT
  );
  const [modeValue, resolvedThemeValue] = snapshot.split(":");
  const mode = isThemeMode(modeValue) ? modeValue : "system";
  const resolvedTheme: ResolvedTheme =
    resolvedThemeValue === "dark" ? "dark" : "light";

  const setMode = useCallback((nextMode: ThemeMode) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(nextMode, prefersDark);
    writeStoredMode(nextMode);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
    }),
    [mode, resolvedTheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
