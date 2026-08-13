"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useThemePreferences } from "./ThemeContext";
import {
  MagnifyingGlassIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  Squares2X2Icon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowRightOnRectangleIcon,
  UserIcon
} from "@heroicons/react/24/outline";

interface TopHeaderProps {
  onOpenSearch?: () => void;
}

const portalLinks = [
  {
    label: "Partner Portal",
    description: "Campaigns, customers and delivery",
    href: process.env.NEXT_PUBLIC_PARTNER_PORTAL_URL || "http://localhost:3001",
  },
  {
    label: "Customer Portal",
    description: "Services, support and account access",
    href: process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "http://localhost:3002",
  },
  {
    label: "Public Website",
    description: "GBS website and portal directory",
    href: process.env.NEXT_PUBLIC_WEB_PORTAL_URL || "http://localhost:3003",
  },
] as const;

export function TopHeader({ onOpenSearch }: TopHeaderProps) {
  const { user, logout } = useAuth();
  const { resolvedTheme, setThemeMode } = useThemePreferences();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleTheme = () => {
    setThemeMode(resolvedTheme === "dark" ? "light" : "dark");
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Admin User";

  return (
    <header className="gbs-admin-header sticky top-0 z-50 flex h-12 w-full items-center justify-between px-3 sm:px-4 border-b border-gray-800 bg-[#0D162B] text-white">
      {/* Left side: Logo & Services Menu */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1">
          <span className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center text-sm font-black shadow-sm">
            GBS
          </span>
          <span className="text-white font-bold tracking-wide hidden sm:block text-sm">
            Global Business Suite
          </span>
        </Link>
        <div className="hidden sm:block h-5 w-px bg-gray-800"></div>

        {/* Services Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setServicesOpen(!servicesOpen)}
            aria-expanded={servicesOpen}
            aria-haspopup="menu"
            aria-label="Open services and portals"
            className="flex items-center gap-1.5 text-gray-300 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition-colors text-sm font-medium"
          >
            <Squares2X2Icon className="h-5 w-5 text-gray-400" />
            <span className="hidden md:block">Services</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {/* Services Menu Dropdown */}
          {servicesOpen && (
            <div role="menu" className="absolute top-full left-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl bg-[#111C38] border border-gray-800 shadow-2xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-3">
                <span className="font-bold text-gray-200">GBS Enterprise Suites</span>
                <button aria-label="Close services menu" onClick={() => setServicesOpen(false)} className="text-gray-400 hover:text-white">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/tenants" onClick={() => setServicesOpen(false)} className="p-2 rounded-lg bg-gray-900/60 hover:bg-blue-600/20 text-gray-200 hover:text-blue-400 border border-gray-800/80 transition-all">
                  <p className="font-semibold">🏢 Multi-Tenants</p>
                  <p className="text-[10px] text-gray-400">Manage clients & orgs</p>
                </Link>
                <Link href="/ai-providers" onClick={() => setServicesOpen(false)} className="p-2 rounded-lg bg-gray-900/60 hover:bg-purple-600/20 text-gray-200 hover:text-purple-400 border border-gray-800/80 transition-all">
                  <p className="font-semibold">✨ AI Studio</p>
                  <p className="text-[10px] text-gray-400">LLMs & Agents</p>
                </Link>
                <Link href="/social-studio" onClick={() => setServicesOpen(false)} className="p-2 rounded-lg bg-gray-900/60 hover:bg-amber-600/20 text-gray-200 hover:text-amber-400 border border-gray-800/80 transition-all">
                  <p className="font-semibold">🌐 Social Media</p>
                  <p className="text-[10px] text-gray-400">GBP & Channels</p>
                </Link>
                <Link href="/billing" onClick={() => setServicesOpen(false)} className="p-2 rounded-lg bg-gray-900/60 hover:bg-emerald-600/20 text-gray-200 hover:text-emerald-400 border border-gray-800/80 transition-all">
                  <p className="font-semibold">💳 Billing Engine</p>
                  <p className="text-[10px] text-gray-400">Invoices & Seats</p>
                </Link>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Connected portals
                </p>
                <div className="space-y-1.5">
                  {portalLinks.map((portal) => (
                    <a
                      key={portal.label}
                      href={portal.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setServicesOpen(false)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-800/80 bg-gray-900/60 p-2 text-gray-200 transition-colors hover:border-blue-500/60 hover:text-blue-400"
                    >
                      <span>
                        <span className="block font-semibold">{portal.label}</span>
                        <span className="block text-[10px] text-gray-400">{portal.description}</span>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar matching screenshot */}
      <div className="hidden md:flex flex-1 max-w-xl mx-6">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            readOnly
            onClick={onOpenSearch}
            aria-label="Open global search"
            className="block w-full rounded-lg border border-gray-800 py-1.5 pl-9 pr-16 text-gray-200 placeholder:text-gray-400 bg-[#070D1E] focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-xs cursor-pointer"
            placeholder="Search resources, services, and docs..."
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-gray-800 border border-gray-700 rounded">
              Ctrl+K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right side: Actions matching screenshot */}
      <div className="flex items-center gap-3">
        {/* Mobile Search Toggle */}
        <button
          onClick={onOpenSearch}
          aria-label="Open global search"
          className="md:hidden text-gray-300 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>

        {/* Notifications Icon with Badge 5 */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Open notifications"
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            className="relative text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-[#0D162B]">
              5
            </span>
          </button>

          {/* Notifications Drawer Overlay */}
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 rounded-xl bg-[#111C38] border border-gray-800 shadow-2xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-3">
                <span className="font-bold text-gray-200">Notifications (5)</span>
                <button aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} className="text-gray-400 hover:text-white">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="p-2 rounded bg-gray-900/50 border border-gray-800 flex items-start gap-2">
                  <span className="text-green-400">●</span>
                  <div>
                    <p className="font-semibold text-gray-200">New user registered</p>
                    <p className="text-[10px] text-gray-400">2 minutes ago</p>
                  </div>
                </div>
                <div className="p-2 rounded bg-gray-900/50 border border-gray-800 flex items-start gap-2">
                  <span className="text-blue-400">●</span>
                  <div>
                    <p className="font-semibold text-gray-200">Post published to Facebook</p>
                    <p className="text-[10px] text-gray-400">5 minutes ago</p>
                  </div>
                </div>
                <div className="p-2 rounded bg-gray-900/50 border border-gray-800 flex items-start gap-2">
                  <span className="text-purple-400">●</span>
                  <div>
                    <p className="font-semibold text-gray-200">AI content generated</p>
                    <p className="text-[10px] text-gray-400">12 minutes ago</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Button */}
        <Link aria-label="Open help and developer portal" href="/developer-portal" className="hidden sm:inline-flex text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <QuestionMarkCircleIcon className="h-5 w-5" />
        </Link>

        {/* Settings Button */}
        <Link aria-label="Open system settings" href="/settings" className="hidden sm:inline-flex text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <Cog6ToothIcon className="h-5 w-5" />
        </Link>

        {/* Theme Toggle Pill Switch (Sun/Moon matching image) */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-300 hover:border-gray-700 transition-all text-xs"
        >
          <SunIcon className={`h-3.5 w-3.5 ${resolvedTheme === "light" ? "text-amber-400 font-bold" : "text-gray-500"}`} />
          <span className="text-[10px] font-semibold text-gray-400">/</span>
          <MoonIcon className={`h-3.5 w-3.5 ${resolvedTheme === "dark" ? "text-blue-400 font-bold" : "text-gray-500"}`} />
        </button>

        <div className="h-5 w-px bg-gray-800 mx-0.5 hidden sm:block"></div>

        {/* User Profile Pill matching screenshot */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="Open admin profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              A
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold leading-tight text-gray-200">
                {displayName}
              </span>
              <span className="text-[10px] text-gray-400 leading-tight">
                Super Admin
              </span>
            </div>
            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-[#111C38] border border-gray-800 shadow-2xl p-2 z-50 text-xs">
              <div className="p-2 border-b border-gray-800 mb-1">
                <p className="font-bold text-gray-200">{displayName}</p>
                <p className="text-[10px] text-gray-400">{user?.email || "admin@platform.local"}</p>
              </div>
              <Link href="/users" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 p-2 rounded hover:bg-gray-800 text-gray-200">
                <UserIcon className="h-4 w-4" /> Profile & Account
              </Link>
              <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 p-2 rounded hover:bg-gray-800 text-gray-200">
                <Cog6ToothIcon className="h-4 w-4" /> System Settings
              </Link>
              <button
                onClick={() => { setProfileOpen(false); logout(); }}
                className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-red-500/20 text-red-400 mt-1 border-t border-gray-800"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopHeader;
