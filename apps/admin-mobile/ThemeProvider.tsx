import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, useColorScheme } from "react-native";
import {
  createThemePreferenceStorage,
  nextThemeMode,
  resolveThemeMode,
  type ResolvedTheme,
  type ThemeMode,
} from "./mobileTheme";

type ThemePreferences = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemePreferences | null>(null);
const preferenceStorage = createThemePreferenceStorage(AsyncStorage);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setStoredThemeMode] = useState<ThemeMode>("system");
  const userChangedTheme = useRef(false);
  const resolvedTheme = resolveThemeMode(themeMode, systemScheme);

  useEffect(() => {
    let active = true;

    preferenceStorage
      .read()
      .then((storedMode) => {
        if (active && !userChangedTheme.current) setStoredThemeMode(storedMode);
      })
      .catch(() => {
        // A storage failure should not prevent the app from following the system theme.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(resolvedTheme === "dark" ? "#0f172a" : "#f8fafc").catch(
      () => {
        // The React Native root still receives the correct themed background.
      },
    );
  }, [resolvedTheme]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    userChangedTheme.current = true;
    setStoredThemeMode(mode);
    preferenceStorage.write(mode).catch(() => {
      // Keep the in-memory preference even if the device storage is temporarily unavailable.
    });
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      resolvedTheme,
      isDark: resolvedTheme === "dark",
      setThemeMode,
    }),
    [resolvedTheme, setThemeMode, themeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreferences() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useThemePreferences must be used inside ThemeProvider");
  return value;
}

export function ThemeModeControl() {
  const { isDark, setThemeMode, themeMode } = useThemePreferences();
  const visibleMode = themeMode[0].toUpperCase() + themeMode.slice(1);

  return (
    <TouchableOpacity
      accessibilityHint="Cycles between system, light, and dark appearance"
      accessibilityLabel={`Theme mode: ${visibleMode}`}
      accessibilityRole="button"
      onPress={() => setThemeMode(nextThemeMode(themeMode))}
      style={[styles.control, isDark ? styles.darkControl : styles.lightControl]}
      testID="theme-mode-control"
    >
      <Text style={[styles.label, isDark ? styles.darkLabel : styles.lightLabel]}>
        Theme: {visibleMode}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  control: {
    minHeight: 40,
    minWidth: 104,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  darkControl: { backgroundColor: "#334155", borderColor: "#475569" },
  lightControl: { backgroundColor: "#e2e8f0", borderColor: "#cbd5e1" },
  label: { fontSize: 12, fontWeight: "700" },
  darkLabel: { color: "#ffffff" },
  lightLabel: { color: "#0f172a" },
});
