import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DashboardWrapper } from "../../app/DashboardWrapper";
import {
  ADMIN_PREFERENCES_STORAGE_KEY,
  ThemeProvider,
  useThemePreferences,
} from "../../app/ThemeContext";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("next/link", () => {
  return ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  );
});

jest.mock("../../app/AuthContext", () => ({
  useAuth: () => ({
    user: {
      firstName: "Admin",
      lastName: "User",
      email: "admin@enterprise.com",
    },
    logout: jest.fn(),
  }),
}));

function PreferenceHarness() {
  const { themeMode, selectedLayout, setThemeMode, setSelectedLayout } =
    useThemePreferences();
  return (
    <div>
      <output aria-label="theme preference">{themeMode}</output>
      <output aria-label="layout preference">{selectedLayout}</output>
      <button type="button" onClick={() => setThemeMode("light")}>Light</button>
      <button type="button" onClick={() => setSelectedLayout(3)}>Layout 3</button>
    </div>
  );
}

function renderAdminShell() {
  return render(
    <ThemeProvider>
      <DashboardWrapper>
        <div>Dashboard content</div>
      </DashboardWrapper>
    </ThemeProvider>,
  );
}

describe("Admin dashboard shell behavior", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockPush.mockClear();
  });

  it("persists real theme and dashboard layout preferences", async () => {
    render(
      <ThemeProvider>
        <PreferenceHarness />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    fireEvent.click(screen.getByRole("button", { name: "Layout 3" }));

    await waitFor(() => {
      expect(screen.getByLabelText("theme preference")).toHaveTextContent("light");
      expect(screen.getByLabelText("layout preference")).toHaveTextContent("3");
      expect(document.documentElement).toHaveAttribute("data-theme", "light");
      expect(document.documentElement).toHaveAttribute("data-dashboard-layout", "3");
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(ADMIN_PREFERENCES_STORAGE_KEY) ?? "{}",
      ),
    ).toMatchObject({ themeMode: "light", selectedLayout: 3 });
  });

  it("opens Ctrl+K, filters destinations, and navigates the selected result", async () => {
    renderAdminShell();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(
      screen.getByRole("dialog", { name: "Global command palette" }),
    ).toBeInTheDocument();

    const search = screen.getByPlaceholderText(
      "Type a command or search users, tenants, AI engines...",
    );
    fireEvent.change(search, { target: { value: "Roles & Permissions" } });
    expect(screen.getByText("1 result")).toBeInTheDocument();
    fireEvent.keyDown(search, { key: "Enter" });

    expect(mockPush).toHaveBeenCalledWith("/roles");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("collapses the sidebar, updates shell geometry, and persists the choice", () => {
    renderAdminShell();

    const content = screen.getByTestId("admin-content");
    expect(content).toHaveClass("md:ml-56");
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(content).toHaveClass("md:ml-16");
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("gbs-admin-sidebar:v1")).toBe("collapsed");
  });
});
