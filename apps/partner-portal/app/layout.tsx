import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./AuthContext";
import { DashboardWrapper } from "./DashboardWrapper";
import { ThemeProvider } from "./ThemeProvider";
import { THEME_STORAGE_KEY } from "./theme-config";

export const metadata: Metadata = {
  title: "GBS Partner Portal — Global Business Suite",
  description:
    "Manage your business, customers, leads, sales, campaigns, and AI tools with Global Business Suite (GBS).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

import { TenantProvider } from "./TenantContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full"
      data-theme="light"
      data-theme-preference="system"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var parsed=raw?JSON.parse(raw):null;var mode=parsed&&['light','dark','system'].includes(parsed.mode)?parsed.mode:'system';var dark=mode==='dark'||(mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var theme=dark?'dark':'light';var root=document.documentElement;root.dataset.theme=theme;root.dataset.themePreference=mode;root.classList.toggle('dark',dark);root.style.colorScheme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="gbs-partner-root h-full w-full antialiased">
        <ThemeProvider>
          <AuthProvider>
            <TenantProvider>
              <DashboardWrapper>{children}</DashboardWrapper>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
