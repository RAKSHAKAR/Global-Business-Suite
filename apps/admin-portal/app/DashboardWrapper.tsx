"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { TopHeader } from "./TopHeader";
import { navItems, Sidebar } from "./Sidebar";

const PUBLIC_AUTH_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
];

const SIDEBAR_STORAGE_KEY = "gbs-admin-sidebar:v1";

const commandItems = Array.from(
  new Map(
    navItems
      .flatMap((group) =>
        group.links.map((link) => ({
          href: link.href,
          label: link.label,
          group: group.group,
          icon: link.icon,
        })),
      )
      .map((item) => [item.href, item]),
  ).values(),
);

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isPublicAuthPage = PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`),
  );

  const filteredCommands = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return commandItems.slice(0, 12);

    return commandItems.filter((item) =>
      `${item.label} ${item.group}`.toLocaleLowerCase().includes(query),
    );
  }, [searchQuery]);

  const currentPageLabel = useMemo(() => {
    if (pathname === "/") return "Dashboard";
    return commandItems.find((item) => item.href === pathname)?.label ||
      pathname
        ?.split("/")
        .filter(Boolean)
        .pop()
        ?.replaceAll("-", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
      "Admin";
  }, [pathname]);

  const openGlobalSearch = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setSearchQuery("");
    setActiveResultIndex(0);
    setGlobalSearchOpen(true);
  }, []);

  const closeGlobalSearch = useCallback(() => {
    setGlobalSearchOpen(false);
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  const navigateToCommand = useCallback(
    (href: string) => {
      closeGlobalSearch();
      router.push(href);
    },
    [closeGlobalSearch, router],
  );

  useEffect(() => {
    try {
      setSidebarCollapsed(
        window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed",
      );
    } catch {
      // Keep the expanded default when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openGlobalSearch();
        return;
      }

      if (event.key === "Escape" && globalSearchOpen) {
        event.preventDefault();
        closeGlobalSearch();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, [closeGlobalSearch, globalSearchOpen, openGlobalSearch]);

  useEffect(() => {
    if (!globalSearchOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [globalSearchOpen]);

  const handleSidebarCollapsedChange = useCallback((isCollapsed: boolean) => {
    setSidebarCollapsed(isCollapsed);
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        isCollapsed ? "collapsed" : "expanded",
      );
    } catch {
      // The visual state still works when storage is unavailable.
    }
  }, []);

  if (isPublicAuthPage) return <>{children}</>;

  return (
    <div className="gbs-admin-shell flex min-h-screen w-full flex-col bg-[#0B132B] text-white">
      <TopHeader onOpenSearch={openGlobalSearch} />
      <div className="relative flex w-full flex-1">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onCollapsedChange={handleSidebarCollapsedChange}
        />
        <div
          data-testid="admin-content"
          className={`flex min-w-0 flex-1 flex-col bg-[#0B132B] transition-[margin] duration-300 ${
            sidebarCollapsed ? "md:ml-16" : "md:ml-56"
          }`}
        >
          <main className="w-full flex-1 overflow-x-hidden px-3 py-4 sm:px-5 lg:px-6">
            <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <Link href="/" className="transition-colors hover:text-blue-400">Admin</Link>
              <span aria-hidden="true">/</span>
              <span className="text-gray-200" aria-current="page">{currentPageLabel}</span>
            </nav>
            {children}
          </main>
        </div>
      </div>

      {globalSearchOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-20 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-palette-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeGlobalSearch();
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-800 bg-[#111C38] shadow-2xl">
            <h2 id="command-palette-title" className="sr-only">Global command palette</h2>
            <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setActiveResultIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveResultIndex((current) =>
                      Math.min(current + 1, Math.max(filteredCommands.length - 1, 0)),
                    );
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveResultIndex((current) => Math.max(current - 1, 0));
                  } else if (event.key === "Enter" && filteredCommands[activeResultIndex]) {
                    event.preventDefault();
                    navigateToCommand(filteredCommands[activeResultIndex].href);
                  }
                }}
                autoFocus
                aria-controls="command-palette-results"
                aria-activedescendant={
                  filteredCommands[activeResultIndex]
                    ? `command-result-${activeResultIndex}`
                    : undefined
                }
                placeholder="Type a command or search users, tenants, AI engines..."
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <kbd className="hidden rounded border border-gray-700 bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 sm:inline-block">
                Esc
              </kbd>
              <button
                type="button"
                aria-label="Close global search"
                onClick={closeGlobalSearch}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto p-3 text-xs">
              <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500" aria-live="polite">
                {filteredCommands.length} {filteredCommands.length === 1 ? "result" : "results"}
              </p>
              <div id="command-palette-results" role="listbox" aria-label="Navigation results" className="space-y-1">
                {filteredCommands.length ? (
                  filteredCommands.map((item, index) => (
                    <button
                      key={item.href}
                      id={`command-result-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeResultIndex}
                      onMouseEnter={() => setActiveResultIndex(index)}
                      onClick={() => navigateToCommand(item.href)}
                      className={`flex w-full items-center justify-between gap-4 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        index === activeResultIndex
                          ? "border-blue-500/60 bg-blue-600/20 text-blue-300"
                          : "border-transparent text-gray-200 hover:bg-gray-900/60"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                        <span className="truncate font-semibold">{item.label}</span>
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">{item.group}</span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-700 px-4 py-8 text-center text-gray-400">
                    No admin destination matches “{searchQuery}”.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DashboardWrapper;
