"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalSwitcher, ThemeSwitcher } from "./PortalControls";

const navigation = [
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/portals", label: "Portals Directory" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(`${href}/`));

  return (
    <header className="gbs-site-header sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 tracking-tight" aria-label="Global Business Suite home">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-black text-white shadow-md">
            GBS
          </span>
          <span className="hidden truncate text-lg font-bold sm:inline xl:text-xl">
            Global Business Suite
          </span>
        </Link>

        <nav className="hidden items-center gap-6 xl:flex" aria-label="Primary">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="gbs-site-nav-link"
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeSwitcher compact />
          <PortalSwitcher compact />
          <details className="gbs-site-mobile-menu xl:hidden">
            <summary aria-label="Open site navigation" title="Site navigation">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M4 6.5h16v2H4v-2Zm0 4.5h16v2H4v-2Zm0 4.5h16v2H4v-2Z" />
              </svg>
            </summary>
            <nav aria-label="Mobile primary navigation">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
