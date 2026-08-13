"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { useAuth } from "./AuthContext";
import { PortalSwitcher, ThemeSwitcher } from "./PortalControls";
import Topbar from "./Topbar";

const PUBLIC_AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-mobile",
];

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isPublicAuthPage = PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (isPublicAuthPage) {
    return (
      <div className="gbs-partner-public-route min-h-screen">
        <div className="gbs-public-route-controls" aria-label="Portal and theme controls">
          <ThemeSwitcher compact />
          <PortalSwitcher compact />
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="gbs-partner-shell flex min-h-screen w-full">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-64 min-h-screen">
        <header
          className="gbs-partner-header sticky top-0 z-20 flex min-h-16 shrink-0 items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8"
        >
          <div className="min-w-0 shrink-0">
            <p className="truncate text-sm font-bold md:hidden">Partner Portal</p>
            <p className="hidden truncate text-sm font-medium md:block">
              {user ? `Welcome back, ${user.firstName ?? user.email}` : "Partner workspace"}
            </p>
            {user?.email && (
              <p className="hidden truncate text-xs md:block">{user.email}</p>
            )}
          </div>
          <Topbar />
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitcher compact />
            <PortalSwitcher compact />
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 w-full min-w-0 overflow-x-hidden
                         pb-20 md:pb-0
                         px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 lg:py-8"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — only on mobile */}
      <BottomNav />
    </div>
  );
}

export default DashboardWrapper;
