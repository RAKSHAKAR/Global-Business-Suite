"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type PrimaryColor =
  | "blue"
  | "purple"
  | "green"
  | "cyan"
  | "amber"
  | "red"
  | "gray";
export type DashboardLayout = 1 | 2 | 3;

type Preferences = {
  themeMode: ThemeMode;
  primaryColor: PrimaryColor;
  selectedLayout: DashboardLayout;
};

type ThemeContextValue = Preferences & {
  resolvedTheme: "light" | "dark";
  setThemeMode: (themeMode: ThemeMode) => void;
  setPrimaryColor: (primaryColor: PrimaryColor) => void;
  setSelectedLayout: (selectedLayout: DashboardLayout) => void;
};

export const ADMIN_PREFERENCES_STORAGE_KEY = "gbs-admin-preferences:v1";

const DEFAULT_PREFERENCES: Preferences = {
  themeMode: "dark",
  primaryColor: "blue",
  selectedLayout: 1,
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function isPrimaryColor(value: unknown): value is PrimaryColor {
  return ["blue", "purple", "green", "cyan", "amber", "red", "gray"].includes(
    String(value),
  );
}

function isDashboardLayout(value: unknown): value is DashboardLayout {
  return value === 1 || value === 2 || value === 3;
}

function loadPreferences(): Preferences {
  try {
    const raw = window.localStorage.getItem(ADMIN_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    const saved = JSON.parse(raw) as Partial<Preferences>;
    return {
      themeMode: isThemeMode(saved.themeMode)
        ? saved.themeMode
        : DEFAULT_PREFERENCES.themeMode,
      primaryColor: isPrimaryColor(saved.primaryColor)
        ? saved.primaryColor
        : DEFAULT_PREFERENCES.primaryColor,
      selectedLayout: isDashboardLayout(saved.selectedLayout)
        ? saved.selectedLayout
        : DEFAULT_PREFERENCES.selectedLayout,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function resolveTheme(themeMode: ThemeMode): "light" | "dark" {
  if (themeMode !== "system") return themeMode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyPreferences(preferences: Preferences) {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(preferences.themeMode);

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preferences.themeMode;
  root.dataset.primaryColor = preferences.primaryColor;
  root.dataset.dashboardLayout = String(preferences.selectedLayout);
  root.style.colorScheme = resolvedTheme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPreferences();
    setPreferences(saved);
    applyPreferences(saved);
    setResolvedTheme(resolveTheme(saved.themeMode));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncPreferences = () => {
      applyPreferences(preferences);
      setResolvedTheme(resolveTheme(preferences.themeMode));
    };

    syncPreferences();
    try {
      window.localStorage.setItem(
        ADMIN_PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences),
      );
    } catch {
      // Browser privacy settings or quota limits can make localStorage unavailable.
    }

    if (preferences.themeMode !== "system") return;
    mediaQuery.addEventListener("change", syncPreferences);
    return () => mediaQuery.removeEventListener("change", syncPreferences);
  }, [isHydrated, preferences]);

  const setThemeMode = useCallback((themeMode: ThemeMode) => {
    setPreferences((current) => ({ ...current, themeMode }));
  }, []);

  const setPrimaryColor = useCallback((primaryColor: PrimaryColor) => {
    setPreferences((current) => ({ ...current, primaryColor }));
  }, []);

  const setSelectedLayout = useCallback((selectedLayout: DashboardLayout) => {
    setPreferences((current) => ({ ...current, selectedLayout }));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...preferences,
      resolvedTheme,
      setThemeMode,
      setPrimaryColor,
      setSelectedLayout,
    }),
    [preferences, resolvedTheme, setPrimaryColor, setSelectedLayout, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreferences() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreferences must be used within ThemeProvider");
  }
  return context;
}
