"use client";

import { portalUrls, type PortalId } from "./portal-config";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const portals: Array<{ id: PortalId; label: string }> = [
  { id: "admin", label: "Admin Portal" },
  { id: "partner", label: "Partner Portal" },
  { id: "customer", label: "Customer Portal" },
  { id: "web", label: "Public Website" },
];

const themeOptions: Array<{ mode: ThemeMode; label: string; icon: string }> = [
  { mode: "light", label: "Light", icon: "☀" },
  { mode: "system", label: "System", icon: "◐" },
  { mode: "dark", label: "Dark", icon: "☾" },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();
  return (
    <fieldset className="gbs-theme-switcher" aria-label="Theme preference">
      <legend className="sr-only">Theme preference</legend>
      {themeOptions.map((option) => (
        <button
          key={option.mode}
          type="button"
          className="gbs-theme-option"
          data-theme-option={option.mode}
          aria-label={`Use ${option.label.toLowerCase()} theme`}
          aria-pressed={mode === option.mode}
          title={`${option.label} theme`}
          onClick={() => setMode(option.mode)}
        >
          <span aria-hidden="true">{option.icon}</span>
          {!compact && <span className="gbs-theme-option-label">{option.label}</span>}
        </button>
      ))}
    </fieldset>
  );
}

export function PortalSwitcher({
  current = "web",
  compact = false,
}: {
  current?: PortalId;
  compact?: boolean;
}) {
  return (
    <details className="gbs-portal-switcher">
      <summary aria-label="Switch portal" title="Switch portal">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M4 3h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm10 0h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM4 13h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm10 0h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z"
          />
        </svg>
        {!compact && <span>Portals</span>}
      </summary>
      <div className="gbs-portal-menu" aria-label="GBS portals">
        {portals.map((portal) =>
          portal.id === current ? (
            <span key={portal.id} aria-current="page" className="is-current">
              {portal.label}
              <small>Current</small>
            </span>
          ) : (
            <a key={portal.id} href={portalUrls[portal.id]}>
              {portal.label}
              <span aria-hidden="true">↗</span>
            </a>
          )
        )}
      </div>
    </details>
  );
}

