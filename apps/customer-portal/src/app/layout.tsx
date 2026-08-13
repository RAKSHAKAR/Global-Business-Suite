import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeProvider";
import { THEME_STORAGE_KEY } from "./theme-config";
import { PublicRouteControls } from "@/components/PortalControls";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GBS Customer Portal — Global Business Suite",
  description:
    "Global Business Suite (GBS) Customer Portal - Projects, Tasks, Documents, Calendar, and AI Assistant.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
      <body className={`${inter.className} gbs-customer-root`}>
        <ThemeProvider>
          <PublicRouteControls />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
