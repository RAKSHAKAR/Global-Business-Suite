"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Home",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-[#D4AF37]" : "text-gray-400"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/crm",
    label: "CRM",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-[#D4AF37]" : "text-gray-400"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 1.8}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    href: "/social",
    label: "Social",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-[#D4AF37]" : "text-gray-400"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 1.8}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
    ),
  },
  {
    href: "/ai-studio",
    label: "AI",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-[#D4AF37]" : "text-gray-400"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 1.8}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
  },
  {
    href: "/analytics",
    label: "Stats",
    icon: (active: boolean) => (
      <svg
        className={`w-6 h-6 ${active ? "text-[#D4AF37]" : "text-gray-400"}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 1.8}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1A1A1A] border-t border-[#333]
                    flex items-center justify-around
                    safe-area-pb"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile primary navigation"
    >
      {tabs.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/" && pathname?.startsWith(`${tab.href}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center justify-center flex-1 py-2.5 gap-1 transition-opacity
                       active:opacity-70"
          >
            {tab.icon(active)}
            <span
              className={`text-[10px] font-semibold tracking-wider transition-colors
                             ${active ? "text-[#D4AF37]" : "text-gray-500"}`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
