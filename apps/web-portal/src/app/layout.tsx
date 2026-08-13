import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import SiteHeader from "./SiteHeader";
import { ThemeProvider } from "./ThemeProvider";
import { portalUrls } from "./portal-config";
import { THEME_STORAGE_KEY } from "./theme-config";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title:
    "Global Business Suite (GBS) — Enterprise AI Platform & Multi-Tenant Operations",
  description:
    "Enterprise-grade SaaS platform for multi-tenant business suite management, 16+ AI models, Google Business Profile, Social Studio, and CRM.",
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
      <body
        className={`${inter.variable} ${outfit.variable} gbs-web-shell font-sans antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
        <SiteHeader />

        {/* Main Content */}
        <main className="flex-grow">{children}</main>

        {/* Footer */}
        <footer className="bg-black text-white py-16 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-5 gap-10">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                  GBS
                </span>
                <span className="text-xl font-serif font-bold text-white tracking-wide">
                  Global Business Suite
                </span>
              </div>
              <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-4">
                Empowering enterprises, agency partners, and local businesses with intelligent AI workflows, Google Business Profile automation, social publishing, and unified CRM.
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-gray-400 font-mono">System Operational (v3.0.0)</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 uppercase tracking-wider text-xs text-gray-300">
                Platform
              </h4>
              <ul className="space-y-2.5 text-gray-400 text-sm">
                <li>
                  <Link href="/features" className="hover:text-white transition-colors">
                    Features Matrix
                  </Link>
                </li>
                <li>
                  <Link href="/solutions" className="hover:text-white transition-colors">
                    Role Solutions
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Subscription Plans
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-white transition-colors">
                    Enterprise Security
                  </Link>
                </li>
                <li>
                  <Link href="/portals" className="hover:text-white transition-colors">
                    Portals Hub
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 uppercase tracking-wider text-xs text-gray-300">
                Ecosystem
              </h4>
              <ul className="space-y-2.5 text-gray-400 text-sm">
                <li>
                  <a href={portalUrls.admin} className="hover:text-white transition-colors">
                    Admin Portal (:3000)
                  </a>
                </li>
                <li>
                  <a href={portalUrls.partner} className="hover:text-white transition-colors">
                    Partner Portal (:3001)
                  </a>
                </li>
                <li>
                  <a href={portalUrls.customer} className="hover:text-white transition-colors">
                    Customer Portal (:3002)
                  </a>
                </li>
                <li>
                  <a href="http://localhost:4000/api-docs" className="hover:text-white transition-colors">
                    API Docs (:4000)
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 uppercase tracking-wider text-xs text-gray-300">
                Company & Legal
              </h4>
              <ul className="space-y-2.5 text-gray-400 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About GBS
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact Sales
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-900 text-xs text-gray-500 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>
              &copy; {new Date().getFullYear()} Global Business Suite (GBS). All rights reserved. Built for multi-tenant enterprise growth.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
