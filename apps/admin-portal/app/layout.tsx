import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./AuthContext";
import { DashboardWrapper } from "./DashboardWrapper";
import { ThemeProvider } from "./ThemeContext";

export const metadata: Metadata = {
  title: "GBS Admin Portal — Global Business Suite",
  description:
    "Super Admin Portal for Global Business Suite (GBS) enterprise platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const themeBootstrapScript = `
  (function () {
    var defaults = { themeMode: "dark", primaryColor: "blue", selectedLayout: 1 };
    try {
      var raw = window.localStorage.getItem("gbs-admin-preferences:v1");
      var saved = raw ? JSON.parse(raw) : defaults;
      var preference = ["light", "dark", "system"].indexOf(saved.themeMode) >= 0
        ? saved.themeMode
        : defaults.themeMode;
      var resolved = preference === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : preference;
      var root = document.documentElement;
      root.classList.toggle("dark", resolved === "dark");
      root.dataset.theme = resolved;
      root.dataset.themePreference = preference;
      root.dataset.primaryColor = saved.primaryColor || defaults.primaryColor;
      root.dataset.dashboardLayout = String(saved.selectedLayout || defaults.selectedLayout);
      root.style.colorScheme = resolved;
    } catch (error) {
      document.documentElement.classList.add("dark");
      document.documentElement.dataset.theme = "dark";
      document.documentElement.dataset.themePreference = "dark";
    }
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="h-full w-full antialiased theme-admin-dense">
        <ThemeProvider>
          <AuthProvider>
            <DashboardWrapper>{children}</DashboardWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
