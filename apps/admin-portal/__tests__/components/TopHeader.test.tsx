import { fireEvent, screen, waitFor } from "@testing-library/react";
import { TopHeader } from "../../app/TopHeader";
import { renderWithTheme } from "../../test-utils";

jest.mock("next/link", () => {
  return ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  );
});

jest.mock("../../app/AuthContext", () => ({
  useAuth: () => ({
    user: {
      firstName: "Ada",
      lastName: "Admin",
      email: "ada.admin@enterprise.com",
    },
    logout: jest.fn(),
  }),
}));

describe("TopHeader", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the product identity and authenticated user", () => {
    renderWithTheme(<TopHeader />);

    expect(screen.getByText("GBS")).toBeInTheDocument();
    expect(screen.getByText("Global Business Suite")).toBeInTheDocument();
    expect(screen.getByText("Ada Admin")).toBeInTheDocument();
  });

  it("opens global search exactly once from the desktop search control", () => {
    const onOpenSearch = jest.fn();
    renderWithTheme(<TopHeader onOpenSearch={onOpenSearch} />);

    fireEvent.click(screen.getByPlaceholderText(/Search resources/i));
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it("toggles the persisted theme from the header", async () => {
    renderWithTheme(<TopHeader />);

    fireEvent.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    );
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "light");
    });
    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeInTheDocument();
  });

  it("interlinks the services menu with every other web portal", () => {
    renderWithTheme(<TopHeader />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open services and portals" }),
    );
    expect(screen.getByRole("link", { name: /Partner Portal/ })).toHaveAttribute(
      "href",
      "http://localhost:3001",
    );
    expect(screen.getByRole("link", { name: /Customer Portal/ })).toHaveAttribute(
      "href",
      "http://localhost:3002",
    );
    expect(screen.getByRole("link", { name: /Public Website/ })).toHaveAttribute(
      "href",
      "http://localhost:3003",
    );
  });
});
