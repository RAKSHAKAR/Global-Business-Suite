"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: "⬡", section: null },
  { href: "/business-profile", label: "Business Profile", icon: "🏢", section: "Organization" },
  { href: "/team", label: "Team Management", icon: "👥", section: "Organization" },
  { href: "/customers", label: "Customer CRM", icon: "🤝", section: "Growth & CRM" },
  { href: "/crm", label: "Deals & Pipelines", icon: "📈", section: "Growth & CRM" },
  { href: "/gbp", label: "Google Business", icon: "🏪", section: "Google & Social" },
  { href: "/social", label: "Social Media Suite", icon: "📢", section: "Google & Social" },
  { href: "/ai-assistant", label: "AI Assistant Chat", icon: "✦", section: "AI & Tools" },
  { href: "/ai-studio", label: "AI Content Studio", icon: "🎨", section: "AI & Tools" },
  { href: "/marketing", label: "Marketing Campaigns", icon: "⚡", section: "AI & Tools" },
  { href: "/calendar-tasks", label: "Calendar & Tasks", icon: "📅", section: "Operations" },
  { href: "/files", label: "Media Asset Vault", icon: "📁", section: "Operations" },
  { href: "/workflows", label: "Workflows & Rules", icon: "🔄", section: "Operations" },
  { href: "/unified-inbox", label: "Unified Inbox (10 Ch)", icon: "📥", section: "Engagement Platform (v19)" },
  { href: "/call-center", label: "Call Center & Softphone", icon: "📞", section: "Engagement Platform (v19)" },
  { href: "/appointments", label: "Appointments & Booking", icon: "📅", section: "Engagement Platform (v19)" },
  { href: "/whitelabel-branding", label: "White-Label Branding", icon: "🎨", section: "Engagement Platform (v19)" },
  { href: "/compliance-reports", label: "Audit & Compliance", icon: "🛡️", section: "Engagement Platform (v19)" },
  { href: "/analytics", label: "Partner BI & Operations", icon: "📈", section: "Analytics & System" },
  { href: "/reports", label: "Reports & Analytics", icon: "📊", section: "Analytics & System" },
  { href: "/notifications", label: "Notifications", icon: "🔔", section: "Analytics & System" },
  { href: "/settings", label: "Settings & Plan", icon: "⚙️", section: "Analytics & System" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    // Sidebar is visible ONLY on md and above; mobile uses BottomNav
    <aside
      className="gbs-partner-sidebar hidden md:flex fixed left-0 top-0 h-full w-64 flex-col z-30"
      aria-label="Partner portal navigation"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-5 border-b border-[#2A2A2A] shrink-0">
        <h1 className="text-white font-bold text-base tracking-tight flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-md">
            GBS
          </span>
          <span>Partner Portal</span>
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Primary">
        {navItems.map((item, idx) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(`${item.href}/`));
          const prevItem = navItems[idx - 1];
          const showSection = item.section && item.section !== prevItem?.section;
          return (
            <div key={item.href}>
              {showSection && (
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 pt-4 pb-1">
                  {item.section}
                </p>
              )}
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                           ${active ? "bg-[#D4AF37] text-[#1A1A1A]" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#2A2A2A] p-4 shrink-0">
        {user && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-0.5">Signed in as</p>
            <p
              className="text-sm text-white font-medium truncate"
              title={user.email}
            >
              {user.email}
            </p>
            <p className="text-xs text-[#D4AF37] mt-0.5">Partner Account</p>
          </div>
        )}
        <button
          onClick={logout}
          aria-label="Sign out of Partner Portal"
          className="w-full text-sm font-medium text-gray-400 hover:text-white
                     border border-[#333] hover:border-[#555] rounded-xl py-2.5
                     transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
