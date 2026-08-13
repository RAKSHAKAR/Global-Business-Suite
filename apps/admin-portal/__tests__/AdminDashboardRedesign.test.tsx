import fs from "node:fs";
import path from "node:path";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import AdminDashboard from "../app/page";
import { ADMIN_PREFERENCES_STORAGE_KEY } from "../app/ThemeContext";
import { renderWithTheme } from "../test-utils";

jest.mock("next/link", () => {
  return function MockNextLink({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock("../app/AuthContext", () => ({
  useAuth: () => ({
    token: "mock-jwt-token",
    user: { email: "admin@platform.local" },
    logout: jest.fn(),
  }),
}));

const WIDGET_PREFERENCES_KEY = "gbs-admin-dashboard-widgets:v1";

const dashboardResponse = {
  widgets: {
    range: {
      key: "7d",
      label: "Last 7 days",
      from: "2026-08-04T00:00:00.000Z",
      to: "2026-08-11T00:00:00.000Z",
    },
    systemOverview: {
      status: "AVAILABLE",
      uptimeSeconds: 7200,
      version: "test-build",
      nodeEnv: "test",
      region: null,
      observedAt: "2026-08-11T00:00:00.000Z",
      tenantCount: 3,
      databaseStatus: "CONNECTED",
    },
    activeUsers: { total: 7, active: 6, suspended: 1 },
    activePartners: { total: 3, active: 2 },
    activeCustomers: { total: 4, active: 3 },
    revenueOverview: {
      collectedAmount: 125,
      previousCollectedAmount: 100,
      currency: "USD",
      growthRate: 25,
      amountsByCurrency: [{ currency: "USD", amount: 125 }],
      series: [{ label: "2026-08-11", amount: 125 }],
    },
    subscriptionSummary: { active: 2, trial: 1, canceled: 1, pastDue: 0, total: 4 },
    aiProviderStatus: {
      activeProviders: 1,
      tokensUsed: 250,
      configuredMonthlyQuota: 1000,
      configuredUsageCurrent: 250,
      requestCount: 2,
      successRate: 100,
      averageLatencyMs: 80,
    },
    apiHealth: {
      status: "RESPONDING",
      observedAt: "2026-08-11T00:00:00.000Z",
      requestDurationMs: 12,
      requestVolume: null,
      errorRate: null,
      note: "Gateway observability is not connected.",
    },
    securityAlerts: {
      threatsInRange: 2,
      failedLoginsInRange: 0,
      mfaEnabledUsers: 3,
    },
    auditLogs: { totalLogs: 1, recentActionsCount: 1, recent: [] },
    performanceMetrics: {
      monitoringConnected: false,
      cpuUsagePercent: null,
      memoryUsagePercent: null,
      diskUsagePercent: null,
      networkIoPercent: null,
      dbConnectionCount: null,
      note: "Infrastructure monitoring is not connected.",
    },
    socialMediaStatus: { totalPosts: 2, scheduled: 1, publishing: 0, published: 1, failed: 0, pendingApproval: 0 },
    queueStatus: { activeJobs: 0, waitingJobs: 1, completedInRange: 2, failed: 0 },
    backgroundJobs: { scheduled: 1, running: 0, failed: 0, monitoringConnected: true },
    notifications: { createdInRange: 1, deliveryRate: null, note: "Delivery telemetry unavailable." },
    systemLogs: { totalLogs: 2, errorLogs: 0, warningLogs: 1, infoLogs: 1 },
    licenseUsage: { licenseCount: 1, allocatedSeats: 5, usedSeats: 3, available: 2, utilization: 60 },
    storageUsage: { bucketCount: 1, usedMb: 128, totalGb: 1, percentUsed: 12.5 },
    serviceUsage: [{ key: "socialPosts", label: "Social posts", count: 2, percent: 100 }],
  },
};

async function renderDashboard() {
  renderWithTheme(<AdminDashboard />);
  await screen.findByRole("heading", {
    name: "Enterprise Admin Control Center",
  });
}

describe("AdminDashboard interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => dashboardResponse,
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders live telemetry and the right-side control panel", async () => {
    await renderDashboard();

    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getAllByText("Collected Revenue").length).toBeGreaterThan(0);
    expect(screen.getByText("Active Subscriptions")).toBeInTheDocument();
    expect(screen.getByText("AI Token Usage")).toBeInTheDocument();
    expect(screen.getByText("System Health")).toBeInTheDocument();
    expect(screen.getByText("Quick Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Theme & Layout")).toBeInTheDocument();
  });

  it("routes quick actions to the real management screens", async () => {
    await renderDashboard();

    expect(screen.getByRole("link", { name: "Add New Tenant" })).toHaveAttribute("href", "/tenants");
    expect(screen.getByRole("link", { name: "Invite User" })).toHaveAttribute("href", "/users");
    expect(screen.getByRole("link", { name: "Create Workflow" })).toHaveAttribute("href", "/workflow-builder");
    expect(screen.getByRole("link", { name: "Generate AI Content" })).toHaveAttribute("href", "/social-studio");
  });

  it("saves widget visibility and restores it after remount", async () => {
    const firstRender = renderWithTheme(<AdminDashboard />);
    await screen.findByRole("heading", { name: "Enterprise Admin Control Center" });

    fireEvent.click(screen.getByRole("button", { name: "Configure Widgets" }));
    const systemOverviewToggle = screen.getByRole("checkbox", {
      name: "System Overview",
    });
    expect(systemOverviewToggle).toBeChecked();
    fireEvent.click(systemOverviewToggle);
    fireEvent.click(screen.getByRole("button", { name: "Save Configuration" }));

    expect(screen.getByTestId("widget-systemOverview")).toHaveClass("hidden");
    expect(
      JSON.parse(window.localStorage.getItem(WIDGET_PREFERENCES_KEY) ?? "{}")
        .visible,
    ).not.toContain("systemOverview");

    firstRender.unmount();
    renderWithTheme(<AdminDashboard />);
    await screen.findByRole("heading", { name: "Enterprise Admin Control Center" });
    await waitFor(() => {
      expect(screen.getByTestId("widget-systemOverview")).toHaveClass("hidden");
    });
  });

  it("adds and removes a telemetry widget with persistent state", async () => {
    await renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Add Widget" }));
    fireEvent.click(screen.getByRole("button", { name: "Add: Security Threats" }));

    const addedWidget = screen.getByTestId("custom-widget-securityThreats");
    expect(addedWidget).toHaveTextContent("Security Threats");
    expect(addedWidget).toHaveTextContent("2");
    expect(
      JSON.parse(window.localStorage.getItem(WIDGET_PREFERENCES_KEY) ?? "{}")
        .added,
    ).toContain("securityThreats");

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Security Threats widget" }),
    );
    expect(screen.queryByTestId("custom-widget-securityThreats")).not.toBeInTheDocument();
  });

  it("downloads real JSON and CSV snapshot blobs", async () => {
    const createObjectURL = jest.fn((_blob: Blob) => "blob:dashboard-snapshot");
    const revokeObjectURL = jest.fn((_url: string) => undefined);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    const downloadNames: string[] = [];
    jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadNames.push(this.download);
      });

    await renderDashboard();
    fireEvent.click(screen.getByRole("button", { name: "Export Snapshot" }));
    fireEvent.click(screen.getByRole("button", { name: /Download JSON/ }));
    fireEvent.click(screen.getByRole("button", { name: "Export Snapshot" }));
    fireEvent.click(screen.getByRole("button", { name: /Download CSV/ }));

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe("application/json");
    expect((createObjectURL.mock.calls[1][0] as Blob).type).toBe("text/csv;charset=utf-8");
    expect(downloadNames[0]).toMatch(/\.json$/);
    expect(downloadNames[1]).toMatch(/\.csv$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:dashboard-snapshot");
  });

  it("applies and persists theme, accent, and layout selections", async () => {
    await renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Use light theme" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Use purple as the primary color" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Use dashboard layout 3" }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "light");
      expect(document.documentElement).toHaveAttribute("data-primary-color", "purple");
      expect(document.documentElement).toHaveAttribute("data-dashboard-layout", "3");
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(ADMIN_PREFERENCES_STORAGE_KEY) ?? "{}",
      ),
    ).toMatchObject({
      themeMode: "light",
      primaryColor: "purple",
      selectedLayout: 3,
    });
  });

  it("sends the selected reporting period to the telemetry API", async () => {
    await renderDashboard();

    fireEvent.change(screen.getByRole("combobox", { name: "Dashboard reporting period" }), {
      target: { value: "30d" },
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining("range=30d"),
        expect.any(Object),
      );
    });
  });

  it("does not substitute demo telemetry when the API fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "unavailable" }),
    } as Response);

    renderWithTheme(<AdminDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dashboard telemetry unavailable",
    );
    expect(screen.queryByText("1.42M")).not.toBeInTheDocument();
    expect(screen.queryByText("99.98%")).not.toBeInTheDocument();
    expect(screen.queryByText("12,540")).not.toBeInTheDocument();
  });

  it("keeps known screenshot-only telemetry out of the dashboard source", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app", "page.tsx"),
      "utf8",
    );

    for (const demoValue of [
      "1.42M",
      "99.98%",
      "12,540",
      "48,500",
      "May 13, 2024",
      "All systems operational",
    ]) {
      expect(source).not.toContain(demoValue);
    }
  });
});
