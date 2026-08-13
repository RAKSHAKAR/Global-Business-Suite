import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortalSwitcher, ThemeSwitcher } from "./PortalControls";
import { ThemeProvider } from "@/app/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/app/theme-config";

function installMatchMedia(matches = false) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe("Customer portal theme and navigation controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-preference");
    document.documentElement.classList.remove("dark");
    installMatchMedia(false);
  });

  it("applies and persists an explicit dark theme", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );
    await user.click(screen.getByRole("button", { name: "Use dark theme" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-theme-preference", "dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) || "{}")).toEqual({ mode: "dark" });
  });

  it("resolves system mode from the operating-system preference", async () => {
    installMatchMedia(true);
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    await waitFor(() => expect(document.documentElement).toHaveAttribute("data-theme", "dark"));
    expect(document.documentElement).toHaveAttribute("data-theme-preference", "system");
    expect(screen.getByRole("button", { name: "Use system theme" })).toHaveAttribute("aria-pressed", "true");
  });

  it("restores a versioned preference and exposes every other portal", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: "light" }));
    render(
      <ThemeProvider>
        <ThemeSwitcher />
        <PortalSwitcher />
      </ThemeProvider>
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Use light theme" })).toHaveAttribute("aria-pressed", "true")
    );
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(screen.getByText("Customer Portal")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Admin Portal").closest("a")).toHaveAttribute("href", "http://localhost:3000");
    expect(screen.getByText("Partner Portal").closest("a")).toHaveAttribute("href", "http://localhost:3001");
    expect(screen.getByText("Public Website").closest("a")).toHaveAttribute("href", "http://localhost:3003");
  });
});
