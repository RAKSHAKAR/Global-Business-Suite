"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  KeyIcon,
  SparklesIcon,
  Cog8ToothIcon,
  CloudArrowDownIcon,
  GlobeAltIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  CommandLineIcon
} from "@heroicons/react/24/outline";

export const navItems = [
  {
    group: "CORE OPERATIONS",
    links: [
      { href: "/", label: "Dashboard", icon: <HomeIcon className="w-4 h-4" /> },
      { href: "/global-search", label: "Global Search", icon: <GlobeAltIcon className="w-4 h-4" />, badge: "Ctrl+K" },
      { href: "/tenants", label: "Tenants", icon: <BuildingOfficeIcon className="w-4 h-4" /> },
      { href: "/organizations", label: "Org & Teams", icon: <BuildingOfficeIcon className="w-4 h-4" />, badge: "NEW", badgeType: "amber" },
    ],
  },
  {
    group: "IDENTITY & ACCESS",
    links: [
      { href: "/users", label: "Global Users", icon: <UsersIcon className="w-4 h-4" /> },
      { href: "/roles", label: "Roles & Permissions", icon: <KeyIcon className="w-4 h-4" /> },
      { href: "/role-simulator", label: "Permission Simulator", icon: <KeyIcon className="w-4 h-4" />, badge: "NEW", badgeType: "amber" },
      { href: "/approval-workflows", label: "Approval Workflows", icon: <ShieldCheckIcon className="w-4 h-4" /> },
    ],
  },
  {
    group: "AI & AUTOMATION",
    links: [
      { href: "/ai-providers", label: "AI Engines & Providers", icon: <SparklesIcon className="w-4 h-4" /> },
      { href: "/ai-prompts", label: "AI Prompt Library", icon: <SparklesIcon className="w-4 h-4" /> },
      { href: "/ai-agents", label: "AI Agents Control", icon: <SparklesIcon className="w-4 h-4" />, badge: "AI", badgeType: "gold" },
      { href: "/ai-knowledge", label: "Knowledge Base & RAG", icon: <SparklesIcon className="w-4 h-4" />, badge: "AI", badgeType: "gold" },
      { href: "/ai-workflows", label: "AI Workflows", icon: <SparklesIcon className="w-4 h-4" />, badge: "AI", badgeType: "gold" },
      { href: "/ai-governance", label: "AI Safety & Governance", icon: <SparklesIcon className="w-4 h-4" />, badge: "AI", badgeType: "gold" },
      { href: "/workflow-builder", label: "Automation Builder", icon: <CommandLineIcon className="w-4 h-4" />, badge: "NEW", badgeType: "amber" },
    ],
  },
  {
    group: "GOOGLE & SOCIAL",
    links: [
      { href: "/gbp-studio", label: "Google Business", icon: <GlobeAltIcon className="w-4 h-4" />, badge: "NEW", badgeType: "amber" },
      { href: "/social-studio", label: "Social Media Manager", icon: <GlobeAltIcon className="w-4 h-4" />, badge: "NEW", badgeType: "amber" },
      { href: "/analytics", label: "Google Analytics", icon: <ChartBarIcon className="w-4 h-4" /> },
      { href: "/marketing", label: "UTM & Campaigns", icon: <GlobeAltIcon className="w-4 h-4" /> },
    ],
  },
  {
    group: "MONITORING & ANALYTICS",
    links: [
      { href: "/platform-control", label: "System Health", icon: <ShieldCheckIcon className="w-4 h-4" /> },
      { href: "/audit-logs", label: "Logs & Audit Trail", icon: <KeyIcon className="w-4 h-4" /> },
      { href: "/analytics", label: "Performance Metrics", icon: <ChartBarIcon className="w-4 h-4" /> },
      { href: "/cron", label: "Cron Health", icon: <CommandLineIcon className="w-4 h-4" /> },
      { href: "/reports", label: "Reports & Insights", icon: <ChartBarIcon className="w-4 h-4" /> },
    ],
  },
  {
    group: "PLATFORM MANAGEMENT",
    links: [
      { href: "/billing", label: "Subscription & Billing", icon: <Cog8ToothIcon className="w-4 h-4" /> },
      { href: "/license-management", label: "License Management", icon: <KeyIcon className="w-4 h-4" /> },
      { href: "/marketplace", label: "Add-ons & Marketplace", icon: <GlobeAltIcon className="w-4 h-4" /> },
      { href: "/file-manager", label: "Storage & Backup", icon: <CloudArrowDownIcon className="w-4 h-4" /> },
    ],
  },
];

type SidebarProps = {
  isCollapsed: boolean;
  onCollapsedChange: (isCollapsed: boolean) => void;
};

export function Sidebar({ isCollapsed, onCollapsedChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* ── Mobile Bottom Navigation ── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 h-16 bg-[#070D1E] border-t border-gray-800 flex items-center justify-around px-2 pb-safe text-white">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/" ? "text-blue-400 font-bold" : "text-gray-400"}`}
        >
          <HomeIcon className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link
          href="/tenants"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/tenants" ? "text-blue-400 font-bold" : "text-gray-400"}`}
        >
          <BuildingOfficeIcon className="w-5 h-5" />
          <span className="text-[10px]">Tenants</span>
        </Link>
        <Link
          href="/users"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === "/users" ? "text-blue-400 font-bold" : "text-gray-400"}`}
        >
          <UsersIcon className="w-5 h-5" />
          <span className="text-[10px]">Users</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open all admin navigation"
          aria-expanded={isOpen}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isOpen ? "text-blue-400 font-bold" : "text-gray-400"}`}
        >
          <GlobeAltIcon className="w-5 h-5" />
          <span className="text-[10px]">All Apps</span>
        </button>
      </div>

      {/* ── Mobile Slide-Over Drawer ── */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close navigation" onClick={() => setIsOpen(false)} />
          <div className="relative flex-1 max-w-xs w-full bg-[#070D1E] border-r border-gray-800 text-white flex flex-col h-full z-10 pt-4 pb-20 px-3 overflow-y-auto">
            <div className="flex items-center justify-between px-3 pb-3 mb-2 border-b border-gray-800">
              <span className="font-bold text-xs text-blue-400 uppercase tracking-wider">Navigation</span>
              <button aria-label="Close navigation" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-xs font-bold">
                ✕ Close
              </button>
            </div>
            <nav className="space-y-5">
              {navItems.map((group) => (
                <div key={group.group}>
                  <p className="px-3 mb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {group.group}
                  </p>
                  {group.links.map((link) => {
                    const active = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-all mb-0.5 ${
                          active
                            ? "bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500"
                            : "text-gray-400 hover:bg-gray-800/60 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="w-4 text-center" aria-hidden="true">{link.icon}</span>
                          {link.label}
                        </span>
                        {link.badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            link.badgeType === "amber"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : link.badgeType === "gold"
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                              : "bg-gray-800 text-gray-300 border border-gray-700"
                          }`}>
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ── Sidebar panel (Desktop Only matching screenshot) ── */}
      <aside data-testid="admin-sidebar" className={`hidden md:flex fixed top-12 left-0 z-40 h-[calc(100vh-3rem)] flex-col bg-[#070D1E] border-r border-gray-800/80 text-white transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-56"
      }`}>
        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 text-xs scrollbar-thin scrollbar-thumb-gray-800">
          {navItems.map((group) => (
            <div key={group.group}>
              {!isCollapsed && (
                <p className="px-3 mb-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  {group.group}
                </p>
              )}
              {group.links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={isCollapsed ? link.label : undefined}
                    aria-label={isCollapsed ? link.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-md transition-all mb-0.5 group ${
                      active
                        ? "bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span aria-hidden="true" className={`w-4 text-center shrink-0 ${active ? "text-blue-400" : "text-gray-400 group-hover:text-white"}`}>
                        {link.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate">{link.label}</span>
                      )}
                    </span>
                    {!isCollapsed && link.badge && (
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider shrink-0 ${
                        link.badgeType === "amber"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : link.badgeType === "gold"
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                      }`}>
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Collapse Toggle & Copyright matching screenshot */}
        <div className="border-t border-gray-800/80 p-2 shrink-0 bg-[#060B18]">
          <button
            onClick={() => onCollapsedChange(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-white py-1.5 rounded hover:bg-gray-800/50 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeftIcon className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>

          {!isCollapsed && (
            <p className="mt-2 text-[9px] text-gray-400 text-center px-1 font-medium">
              © 2024 Global Business Suite. All rights reserved.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
