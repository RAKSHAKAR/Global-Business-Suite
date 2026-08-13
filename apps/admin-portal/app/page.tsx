"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useThemePreferences } from "./ThemeContext";
import {
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  SparklesIcon,
  ShieldCheckIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon,
  PlusIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  UserPlusIcon,
  CommandLineIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon
} from "@heroicons/react/24/outline";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const WEB_PORTAL_URL = process.env.NEXT_PUBLIC_WEB_PORTAL_URL || "http://localhost:3003";

type WidgetData = {
  range?: { key: string; label: string; from: string; to: string };
  systemOverview?: {
    status: string;
    uptimeSeconds: number;
    version: string | null;
    nodeEnv: string;
    region: string | null;
    observedAt: string;
    tenantCount: number;
    databaseStatus: string;
  };
  activeUsers?: { total: number; active: number; suspended: number };
  activePartners?: { total: number; active: number };
  activeCustomers?: { total: number; active: number };
  subscriptionSummary?: { active: number; trial: number; canceled: number; pastDue: number; total: number };
  revenueOverview?: {
    collectedAmount: number | null;
    previousCollectedAmount: number | null;
    currency: string | null;
    growthRate: number | null;
    amountsByCurrency: Array<{ currency: string; amount: number }>;
    series: Array<{ label: string; amount: number }>;
  };
  googleBusinessStatus?: { connectedLocations: number; unrepliedReviews: number; avgRating: number | null };
  socialMediaStatus?: {
    totalPosts: number;
    scheduled: number;
    publishing: number;
    published: number;
    failed: number;
    pendingApproval: number;
  };
  aiProviderStatus?: {
    activeProviders: number;
    tokensUsed: number;
    configuredMonthlyQuota: number;
    configuredUsageCurrent: number;
    requestCount: number;
    successRate: number | null;
    averageLatencyMs: number | null;
  };
  apiHealth?: {
    status: string;
    observedAt: string;
    requestDurationMs: number;
    requestVolume: null;
    errorRate: null;
    note: string;
  };
  queueStatus?: { activeJobs: number; waitingJobs: number; completedInRange: number; failed: number };
  backgroundJobs?: { scheduled: number; running: number; failed: number; monitoringConnected: boolean };
  notifications?: { createdInRange: number; deliveryRate: null; note: string };
  securityAlerts?: { threatsInRange: number; failedLoginsInRange: number; mfaEnabledUsers: number };
  failedJobs?: { count: number; lastFailure: string | null };
  systemLogs?: { totalLogs: number; errorLogs: number; warningLogs: number; infoLogs: number };
  auditLogs?: {
    totalLogs: number;
    recentActionsCount: number;
    recent: Array<{
      id: string;
      action: string;
      resource: string;
      resourceId: string | null;
      createdAt: string;
    }>;
  };
  licenseUsage?: {
    licenseCount: number;
    allocatedSeats: number;
    usedSeats: number;
    available: number;
    utilization: number | null;
  };
  storageUsage?: { bucketCount: number; usedMb: number; totalGb: number; percentUsed: number | null };
  performanceMetrics?: {
    monitoringConnected: boolean;
    cpuUsagePercent: null;
    memoryUsagePercent: null;
    dbConnectionCount: null;
    diskUsagePercent: null;
    networkIoPercent: null;
    note: string;
  };
  serviceUsage?: Array<{ key: string; label: string; count: number; percent: number }>;
  pendingApprovals?: number;
};

type ConfigurableWidgetId =
  | "systemOverview"
  | "activePartners"
  | "activeCustomers"
  | "revenueOverview"
  | "aiProviderStatus"
  | "apiHealth"
  | "performanceMetrics";

type AddableWidgetId =
  | "securityThreats"
  | "auditFeed"
  | "aiTokenQuota"
  | "databaseConnections"
  | "realTimeTraffic"
  | "customApiMetric";

const CONFIGURABLE_WIDGETS: ReadonlyArray<{
  id: ConfigurableWidgetId;
  label: string;
}> = [
  { id: "systemOverview", label: "System Overview" },
  { id: "activePartners", label: "Active Partners" },
  { id: "activeCustomers", label: "Active Customers" },
  { id: "revenueOverview", label: "Revenue Overview" },
  { id: "aiProviderStatus", label: "AI Provider Status" },
  { id: "apiHealth", label: "API Health" },
  { id: "performanceMetrics", label: "Performance Metrics" },
];

const ADDABLE_WIDGETS: ReadonlyArray<{
  id: AddableWidgetId;
  label: string;
}> = [
  { id: "securityThreats", label: "Security Threats" },
  { id: "auditFeed", label: "Audit Feed" },
  { id: "aiTokenQuota", label: "AI Token Quota" },
  { id: "databaseConnections", label: "Database Connections" },
  { id: "realTimeTraffic", label: "Real-Time Traffic" },
  { id: "customApiMetric", label: "Custom API Metric" },
];

const DEFAULT_VISIBLE_WIDGETS = CONFIGURABLE_WIDGETS.map(({ id }) => id);
const DASHBOARD_WIDGET_PREFERENCES_KEY = "gbs-admin-dashboard-widgets:v1";

function loadDashboardWidgetPreferences(): {
  visible: ConfigurableWidgetId[];
  added: AddableWidgetId[];
} {
  if (typeof window === "undefined") {
    return { visible: [...DEFAULT_VISIBLE_WIDGETS], added: [] };
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_WIDGET_PREFERENCES_KEY);
    if (!raw) return { visible: [...DEFAULT_VISIBLE_WIDGETS], added: [] };

    const saved = JSON.parse(raw) as { visible?: unknown; added?: unknown };
    const visible = Array.isArray(saved.visible)
      ? saved.visible.filter((id): id is ConfigurableWidgetId =>
          CONFIGURABLE_WIDGETS.some((widget) => widget.id === id),
        )
      : [...DEFAULT_VISIBLE_WIDGETS];
    const added = Array.isArray(saved.added)
      ? saved.added.filter((id): id is AddableWidgetId =>
          ADDABLE_WIDGETS.some((widget) => widget.id === id),
        )
      : [];

    return { visible, added };
  } catch {
    return { visible: [...DEFAULT_VISIBLE_WIDGETS], added: [] };
  }
}

function saveDashboardWidgetPreferences(
  visible: ConfigurableWidgetId[],
  added: AddableWidgetId[],
) {
  try {
    window.localStorage.setItem(
      DASHBOARD_WIDGET_PREFERENCES_KEY,
      JSON.stringify({ visible, added }),
    );
  } catch {
    // Preferences remain active for this session when storage is unavailable.
  }
}

function escapeCsvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function dashboardWidgetsToCsv(widgets: WidgetData | null) {
  const rows: string[][] = [["widget", "metric", "value"]];
  Object.entries(widgets ?? {}).forEach(([widget, metrics]) => {
    if (metrics && typeof metrics === "object") {
      Object.entries(metrics).forEach(([metric, value]) => {
        rows.push([
          widget,
          metric,
          value && typeof value === "object"
            ? JSON.stringify(value)
            : String(value ?? ""),
        ]);
      });
    }
  });
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

function formatNumber(value: number | null | undefined) {
  return value == null ? "Unavailable" : value.toLocaleString();
}

function formatPercent(value: number | null | undefined) {
  return value == null ? "Unavailable" : `${value.toLocaleString()}%`;
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null || !currency) return "Unavailable";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "Unavailable";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

function formatStorage(megabytes: number | null | undefined) {
  if (megabytes == null) return "Unavailable";
  if (megabytes >= 1024) return `${(megabytes / 1024).toFixed(2)} GB`;
  return `${megabytes.toFixed(2)} MB`;
}

function formatObservedAt(value: string | null | undefined) {
  if (!value) return "Unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unavailable" : parsed.toLocaleString();
}

function formatActivityTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return parsed.toLocaleString();
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const {
    themeMode,
    setThemeMode,
    primaryColor,
    setPrimaryColor,
    selectedLayout,
    setSelectedLayout,
  } = useThemePreferences();
  const [widgets, setWidgets] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [timeRange, setTimeRange] = useState("7d");

  // Interactive Modal States
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [addWidgetModalOpen, setAddWidgetModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [visibleWidgetIds, setVisibleWidgetIds] = useState<ConfigurableWidgetId[]>(
    [...DEFAULT_VISIBLE_WIDGETS],
  );
  const [draftVisibleWidgetIds, setDraftVisibleWidgetIds] = useState<
    ConfigurableWidgetId[]
  >([...DEFAULT_VISIBLE_WIDGETS]);
  const [addedWidgetIds, setAddedWidgetIds] = useState<AddableWidgetId[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchWidgets = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ range: timeRange });
      const res = await fetch(`${API}/api/v1/admin/dashboard/widgets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Dashboard request failed (${res.status})`);
      const data = await res.json();
      const payload = data?.widgets ?? data?.data?.widgets;
      if (!payload || typeof payload !== "object") {
        throw new Error("Dashboard response did not contain telemetry.");
      }
      setWidgets(payload as WidgetData);
    } catch (error) {
      setWidgets(null);
      setLoadError(error instanceof Error ? error.message : "Dashboard telemetry is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [timeRange, token]);

  useEffect(() => {
    void fetchWidgets();
  }, [fetchWidgets]);

  useEffect(() => {
    const saved = loadDashboardWidgetPreferences();
    setVisibleWidgetIds(saved.visible);
    setDraftVisibleWidgetIds(saved.visible);
    setAddedWidgetIds(saved.added);
  }, []);

  const openWidgetConfiguration = () => {
    setDraftVisibleWidgetIds(visibleWidgetIds);
    setConfigureModalOpen(true);
  };

  const addDashboardWidget = (widgetId: AddableWidgetId) => {
    const nextAdded = addedWidgetIds.includes(widgetId)
      ? addedWidgetIds
      : [...addedWidgetIds, widgetId];
    setAddedWidgetIds(nextAdded);
    saveDashboardWidgetPreferences(visibleWidgetIds, nextAdded);
    setAddWidgetModalOpen(false);
    const label = ADDABLE_WIDGETS.find(({ id }) => id === widgetId)?.label;
    showToast(`${label ?? "Widget"} added to the dashboard.`);
  };

  const removeDashboardWidget = (widgetId: AddableWidgetId) => {
    const nextAdded = addedWidgetIds.filter((id) => id !== widgetId);
    setAddedWidgetIds(nextAdded);
    saveDashboardWidgetPreferences(visibleWidgetIds, nextAdded);
  };

  const saveWidgetConfiguration = () => {
    setVisibleWidgetIds(draftVisibleWidgetIds);
    saveDashboardWidgetPreferences(draftVisibleWidgetIds, addedWidgetIds);
    setConfigureModalOpen(false);
    showToast("Widget visibility saved.");
  };

  const downloadSnapshot = (format: "json" | "csv") => {
    const generatedAt = new Date().toISOString();
    const content =
      format === "json"
        ? JSON.stringify(
            {
              generatedAt,
              timeRange,
              preferences: {
                themeMode,
                primaryColor,
                selectedLayout,
                visibleWidgetIds,
                addedWidgetIds,
              },
              widgets: widgets ?? {},
            },
            null,
            2,
          )
        : dashboardWidgetsToCsv(widgets);
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gbs-dashboard-${generatedAt.replaceAll(":", "-")}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
    showToast(`${format.toUpperCase()} dashboard snapshot downloaded.`);
  };

  const customWidgetValues: Record<AddableWidgetId, string> = {
    securityThreats: formatNumber(widgets?.securityAlerts?.threatsInRange),
    auditFeed: formatNumber(widgets?.auditLogs?.recentActionsCount),
    aiTokenQuota: widgets?.aiProviderStatus?.configuredMonthlyQuota
      ? `${Math.round(
          (widgets.aiProviderStatus.configuredUsageCurrent /
            widgets.aiProviderStatus.configuredMonthlyQuota) *
            100,
        )}%`
      : "Not configured",
    databaseConnections: "Unavailable",
    realTimeTraffic: "Unavailable",
    customApiMetric:
      widgets?.apiHealth?.requestDurationMs == null
        ? "Unavailable"
        : `${widgets.apiHealth.requestDurationMs} ms response`,
  };

  if (loading && !widgets) {
    return (
      <div className="gbs-admin-dashboard flex min-h-[50vh] items-center justify-center" aria-live="polite">
        <div className="rounded-xl border border-gray-800 bg-[#111C38] px-6 py-5 text-sm text-gray-300">
          Loading dashboard telemetry…
        </div>
      </div>
    );
  }

  if (loadError && !widgets) {
    return (
      <div className="gbs-admin-dashboard flex min-h-[50vh] items-center justify-center">
        <div role="alert" className="max-w-lg rounded-xl border border-red-500/40 bg-red-950/30 p-6 text-center">
          <h1 className="text-lg font-bold text-white">Dashboard telemetry unavailable</h1>
          <p className="mt-2 text-sm text-gray-300">{loadError}</p>
          <button type="button" onClick={() => void fetchWidgets()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gbs-admin-dashboard w-full space-y-4 text-gray-100 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl font-semibold text-xs border border-emerald-400 animate-bounce">
          <CheckCircleIcon className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Banner Header Row matching screenshot ── */}
      <div className="gbs-dashboard-banner flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#0D1832] border border-gray-800 p-4 rounded-xl shadow-xl">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Enterprise Admin Control Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-900 border border-gray-700 text-gray-300">
              {widgets?.systemOverview?.version || "Version unavailable"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Database snapshot loaded
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Database-backed platform activity for {widgets?.range?.label || "the selected period"}.
          </p>
        </div>

        {/* Banner Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={openWidgetConfiguration}
            className="px-3.5 py-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-xs font-semibold text-gray-200 border border-gray-700/80 transition-all flex items-center gap-1.5"
          >
            <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
            <span>Configure Widgets</span>
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export Snapshot</span>
          </button>

          <button
            onClick={() => setAddWidgetModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Widget</span>
          </button>

          <div className="h-6 w-px bg-gray-800 mx-1 hidden sm:block"></div>

          {/* Time Filter & Refetch controls */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            aria-label="Dashboard reporting period"
            className="bg-[#070D1E] border border-gray-800 text-gray-200 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last 1 year</option>
          </select>

          <button
            onClick={fetchWidgets}
            title="Refresh Telemetry Data"
            className="p-2 rounded-xl bg-[#070D1E] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white transition-all"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <button
            onClick={openWidgetConfiguration}
            className="p-2 rounded-xl bg-[#070D1E] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white transition-all"
          >
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Top Telemetry KPI Cards Row (5 Cards) matching screenshot ── */}
      <div className="gbs-dashboard-kpis grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-5 gap-3">
        {/* KPI 1: Active Users */}
        <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-400">Active Users</p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1">
              {formatNumber(widgets?.activeUsers?.total)}
            </p>
            <span className="text-[11px] text-emerald-400 font-semibold mt-1 inline-flex items-center gap-1">
              {formatNumber(widgets?.activeUsers?.active)} active
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <UsersIcon className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Monthly Revenue */}
        <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-amber-500/50 transition-all shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-400">Collected Revenue</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {formatMoney(
                widgets?.revenueOverview?.collectedAmount,
                widgets?.revenueOverview?.currency,
              )}
            </p>
            <span className="text-[11px] text-emerald-400 font-semibold mt-1 inline-flex items-center gap-1">
              {widgets?.revenueOverview?.growthRate == null
                ? "No prior-period baseline"
                : `${widgets.revenueOverview.growthRate >= 0 ? "+" : ""}${formatPercent(
                    widgets.revenueOverview.growthRate,
                  )} vs prior period`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <CurrencyDollarIcon className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Active Subscriptions */}
        <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-400">Active Subscriptions</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
              {formatNumber(widgets?.subscriptionSummary?.active)}
            </p>
            <span className="text-[11px] text-gray-400 font-semibold mt-1 inline-block">
              {formatNumber(widgets?.subscriptionSummary?.trial)} on trial
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <ChartBarIcon className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: AI Token Usage */}
        <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-purple-500/50 transition-all shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-400">AI Token Usage</p>
            <p className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">
              {formatNumber(widgets?.aiProviderStatus?.tokensUsed)}
            </p>
            <span className="text-[11px] text-purple-400 font-semibold mt-1 inline-block">
              Tokens in selected period
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <SparklesIcon className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 5: System Health */}
        <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-emerald-500/50 transition-all shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-400">System Health</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {widgets?.apiHealth?.status || "Unavailable"}
            </p>
            <span className="text-[11px] text-emerald-400 font-semibold mt-1 inline-block">
              Database {widgets?.systemOverview?.databaseStatus?.toLowerCase() || "unavailable"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheckIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Main Dashboard Content (3 Columns Grid + Right Utility Drawer Panel) ── */}
      {addedWidgetIds.length > 0 ? (
        <section aria-label="Added dashboard widgets" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {addedWidgetIds.map((widgetId) => {
            const widget = ADDABLE_WIDGETS.find(({ id }) => id === widgetId);
            if (!widget) return null;
            return (
              <article
                key={widgetId}
                data-testid={`custom-widget-${widgetId}`}
                className="rounded-2xl border border-blue-500/40 bg-[#111C38] p-4 shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400">{widget.label}</p>
                    <p className="mt-1 text-xl font-black text-white">{customWidgetValues[widgetId]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDashboardWidget(widgetId)}
                    aria-label={`Remove ${widget.label} widget`}
                    className="rounded-lg border border-gray-700 p-1 text-gray-400 transition-colors hover:border-red-500/60 hover:text-red-400"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      <div className="gbs-dashboard-layout grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Main Grid Span (3 Columns) */}
        <div className="gbs-dashboard-main xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
          {/* 1. System Overview */}
          <div
            data-testid="widget-systemOverview"
            className={`p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2 ${
              visibleWidgetIds.includes("systemOverview") ? "" : "hidden"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">System Overview</h3>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {widgets?.systemOverview?.status || "Unavailable"}
              </span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 pt-1">
              <p className="flex justify-between gap-3"><span>Status:</span> <strong className="text-emerald-400">{widgets?.systemOverview?.status || "Unavailable"}</strong></p>
              <p className="flex justify-between gap-3"><span>API process uptime:</span> <strong className="text-gray-200">{formatDuration(widgets?.systemOverview?.uptimeSeconds)}</strong></p>
              <p className="flex justify-between gap-3"><span>Environment:</span> <strong className="text-gray-200">{widgets?.systemOverview?.nodeEnv || "Unavailable"}</strong></p>
              <p className="flex justify-between gap-3"><span>Version:</span> <strong className="text-gray-200">{widgets?.systemOverview?.version || "Unavailable"}</strong></p>
              <p className="flex justify-between gap-3"><span>Region:</span> <strong className="text-gray-200">{widgets?.systemOverview?.region || "Not configured"}</strong></p>
            </div>
            <Link href="/platform-control" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all system info →
            </Link>
          </div>

          {/* 2. Active Partners */}
          <div
            data-testid="widget-activePartners"
            className={`p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2 ${
              visibleWidgetIds.includes("activePartners") ? "" : "hidden"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Active Partners</h3>
              <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
            </div>
            <div className="pt-1">
              <p className="text-3xl font-black text-white">{formatNumber(widgets?.activePartners?.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{formatNumber(widgets?.activePartners?.active)} active partner accounts</p>
            </div>
            <Link href="/tenants" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-3">
              View all partners →
            </Link>
          </div>

          {/* 3. Active Customers */}
          <div
            data-testid="widget-activeCustomers"
            className={`p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2 ${
              visibleWidgetIds.includes("activeCustomers") ? "" : "hidden"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Active Customers</h3>
              <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
            </div>
            <div className="pt-1">
              <p className="text-3xl font-black text-white">{formatNumber(widgets?.activeCustomers?.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{formatNumber(widgets?.activeCustomers?.active)} active approved customers</p>
            </div>
            <Link href="/users" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-3">
              View all customers →
            </Link>
          </div>

          {/* 4. Revenue Overview (with SVG Sparkline Chart) */}
          <div
            data-testid="widget-revenueOverview"
            className={`p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-amber-500/50 transition-all shadow-xl space-y-2 sm:col-span-2 lg:col-span-1 ${
              visibleWidgetIds.includes("revenueOverview") ? "" : "hidden"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Collected Revenue</h3>
              <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
            </div>
            <div>
              <p className="text-xl font-black text-amber-400">{formatMoney(widgets?.revenueOverview?.collectedAmount, widgets?.revenueOverview?.currency)}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">
                {widgets?.revenueOverview?.growthRate == null
                  ? "Prior-period comparison unavailable"
                  : `${widgets.revenueOverview.growthRate >= 0 ? "+" : ""}${formatPercent(widgets.revenueOverview.growthRate)} vs prior period`}
              </p>
            </div>

            <div className="h-20 w-full pt-1">
              {widgets?.revenueOverview?.series?.length ? (
                <div className="flex h-full items-end gap-1" aria-label="Revenue by period bucket">
                  {widgets.revenueOverview.series.map((point) => {
                    const maximum = Math.max(
                      1,
                      ...widgets.revenueOverview!.series.map((item) => item.amount),
                    );
                    return (
                      <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${point.label}: ${formatMoney(point.amount, widgets.revenueOverview?.currency)}`}>
                        <div className="w-full rounded-t bg-blue-500" style={{ height: `${Math.max(3, (point.amount / maximum) * 48)}px` }} />
                        <span className="w-full truncate text-center text-[7px] text-gray-500">{point.label.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="flex h-full items-center justify-center text-[11px] text-gray-500">No successful payments in this period.</p>
              )}
            </div>

            <Link href="/billing" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all revenue →
            </Link>
          </div>

          {/* 5. Social Media Status */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Social Media Status</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-700/50">
                Multi-Platform
              </span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 pt-1">
              <p className="flex justify-between"><span>Total Posts:</span> <strong className="text-gray-200">{formatNumber(widgets?.socialMediaStatus?.totalPosts)}</strong></p>
              <p className="flex justify-between"><span>Scheduled:</span> <strong className="text-gray-200">{formatNumber(widgets?.socialMediaStatus?.scheduled)}</strong></p>
              <p className="flex justify-between"><span>Published:</span> <strong className="text-gray-200">{formatNumber(widgets?.socialMediaStatus?.published)}</strong></p>
              <p className="flex justify-between"><span>Failed:</span> <strong className="text-gray-200">{formatNumber(widgets?.socialMediaStatus?.failed)}</strong></p>
            </div>
            <Link href="/social-studio" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              Go to Social Manager →
            </Link>
          </div>

          {/* 6. AI Provider Status */}
          <div
            data-testid="widget-aiProviderStatus"
            className={`p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-purple-500/50 transition-all shadow-xl space-y-2 ${
              visibleWidgetIds.includes("aiProviderStatus") ? "" : "hidden"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">AI Provider Status</h3>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                {formatNumber(widgets?.aiProviderStatus?.activeProviders)} configured
              </span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 pt-1">
              <p className="flex justify-between"><span>Active Providers:</span> <strong className="text-gray-200">{formatNumber(widgets?.aiProviderStatus?.activeProviders)}</strong></p>
              <p className="flex justify-between"><span>Tokens Used:</span> <strong className="text-gray-200">{formatNumber(widgets?.aiProviderStatus?.tokensUsed)}</strong></p>
              <p className="flex justify-between"><span>Success Rate:</span> <strong className="text-gray-200">{formatPercent(widgets?.aiProviderStatus?.successRate)}</strong></p>
              <p className="flex justify-between"><span>Avg Response Time:</span> <strong className="text-gray-200">{widgets?.aiProviderStatus?.averageLatencyMs == null ? "Unavailable" : `${widgets.aiProviderStatus.averageLatencyMs} ms`}</strong></p>
            </div>
            <Link href="/ai-providers" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all providers →
            </Link>
          </div>

          {/* 7. API Health */}
          <div
            data-testid="widget-apiHealth"
            className={`p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-emerald-500/50 transition-all shadow-xl space-y-2 ${
              visibleWidgetIds.includes("apiHealth") ? "" : "hidden"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">API Health</h3>
              <span className="text-[10px] font-bold text-emerald-400">{widgets?.apiHealth?.requestDurationMs == null ? "Unavailable" : `${widgets.apiHealth.requestDurationMs} ms`}</span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 pt-1">
              <p className="flex justify-between"><span>Request Status:</span> <strong className="text-emerald-400">{widgets?.apiHealth?.status || "Unavailable"}</strong></p>
              <p className="flex justify-between"><span>Error Rate:</span> <strong className="text-gray-200">Unavailable</strong></p>
              <p className="flex justify-between"><span>Request Volume:</span> <strong className="text-gray-200">Unavailable</strong></p>
              <p className="text-[10px] leading-relaxed text-gray-500">{widgets?.apiHealth?.note || "Gateway observability is not connected."}</p>
            </div>
            <Link href="/platform-control" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View API Gateway →
            </Link>
          </div>

          {/* 8. Queue Status */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Queue Status</h3>
              <span className="text-[10px] font-bold text-blue-400">Database-backed</span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 pt-1">
              <p className="flex justify-between"><span>Processing:</span> <strong className="text-gray-200">{formatNumber(widgets?.queueStatus?.activeJobs)}</strong></p>
              <p className="flex justify-between"><span>Completed in period:</span> <strong className="text-gray-200">{formatNumber(widgets?.queueStatus?.completedInRange)}</strong></p>
              <p className="flex justify-between"><span>Failed / DLQ:</span> <strong className="text-gray-200">{formatNumber(widgets?.queueStatus?.failed)}</strong></p>
              <p className="flex justify-between"><span>Queued:</span> <strong className="text-gray-200">{formatNumber(widgets?.queueStatus?.waitingJobs)}</strong></p>
            </div>
            <Link href="/platform-control" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all queues →
            </Link>
          </div>

          {/* 9. Recent Activity matching screenshot */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Recent Activity</h3>
              <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
            </div>
            <div className="text-[11px] space-y-2 text-gray-300 pt-1">
              {widgets?.auditLogs?.recent?.length ? (
                widgets.auditLogs.recent.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-start gap-1.5">
                      <span className="mt-1 w-1.5 h-1.5 shrink-0 rounded-full bg-blue-400" />
                      <span className="truncate" title={`${entry.action} ${entry.resource}`}>
                        {entry.action.replaceAll("_", " ")} · {entry.resource}
                      </span>
                    </span>
                    <time className="shrink-0 text-[9px] text-gray-500" dateTime={entry.createdAt}>
                      {formatActivityTime(entry.createdAt)}
                    </time>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-gray-500">No audit activity in this period.</p>
              )}
            </div>
            <Link href="/audit-logs" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all activity →
            </Link>
          </div>

          {/* 10. Background Jobs */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Background Jobs</h3>
              <span className="text-[10px] font-bold text-gray-400">Queue records</span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 pt-1">
              <p className="flex justify-between"><span>Scheduled:</span> <strong className="text-gray-200">{formatNumber(widgets?.backgroundJobs?.scheduled)}</strong></p>
              <p className="flex justify-between"><span>Running:</span> <strong className="text-gray-200">{formatNumber(widgets?.backgroundJobs?.running)}</strong></p>
              <p className="flex justify-between"><span>Failed / DLQ:</span> <strong className="text-gray-200">{formatNumber(widgets?.backgroundJobs?.failed)}</strong></p>
              <p className="flex justify-between"><span>Source:</span> <strong className="text-emerald-400">Job queue</strong></p>
            </div>
            <Link href="/platform-control" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              Manage jobs →
            </Link>
          </div>

          {/* 11. System Logs */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">System Logs</h3>
              <span className="text-[10px] font-bold text-blue-400">Logger</span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 pt-1">
              <p className="flex justify-between"><span>Total Logs:</span> <strong className="text-gray-200">{formatNumber(widgets?.systemLogs?.totalLogs)}</strong></p>
              <p className="flex justify-between"><span>Error Logs:</span> <strong className="text-red-400 font-bold">{formatNumber(widgets?.systemLogs?.errorLogs)}</strong></p>
              <p className="flex justify-between"><span>Warning Logs:</span> <strong className="text-amber-400 font-bold">{formatNumber(widgets?.systemLogs?.warningLogs)}</strong></p>
              <p className="flex justify-between"><span>Info Logs:</span> <strong className="text-gray-200">{formatNumber(widgets?.systemLogs?.infoLogs)}</strong></p>
            </div>
            <Link href="/audit-logs" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View logs →
            </Link>
          </div>

          {/* 12. Storage Usage (Donut Gauge SVG matching screenshot) */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Storage Usage</h3>
              <span className="text-[10px] font-bold text-cyan-400">Bucket</span>
            </div>
            <div className="flex items-center justify-around py-1">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-cyan-500/30"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-500"
                    strokeDasharray={`${widgets?.storageUsage?.percentUsed ?? 0}, 100`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-white leading-tight">{formatStorage(widgets?.storageUsage?.usedMb)}</span>
                  <span className="text-[8px] text-gray-400 leading-tight">Used</span>
                </div>
              </div>
              <div className="text-[10px] space-y-1 text-gray-400">
                <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-blue-500" /> Used: {formatStorage(widgets?.storageUsage?.usedMb)}</p>
                <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-cyan-500/40" /> Available: {widgets?.storageUsage ? formatStorage(Math.max(0, widgets.storageUsage.totalGb * 1024 - widgets.storageUsage.usedMb)) : "Unavailable"}</p>
                <p className="font-semibold text-gray-300">Capacity: {widgets?.storageUsage ? `${widgets.storageUsage.totalGb.toLocaleString()} GB` : "Unavailable"}</p>
              </div>
            </div>
            <Link href="/file-manager" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View storage →
            </Link>
          </div>

          {/* 13. Performance Metrics (Progress Bars matching screenshot) */}
          <div
            data-testid="widget-performanceMetrics"
            className={`p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-purple-500/50 transition-all shadow-xl space-y-2 ${
              visibleWidgetIds.includes("performanceMetrics") ? "" : "hidden"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Performance Metrics</h3>
              <span className="text-[10px] font-bold text-purple-400">Observability</span>
            </div>
            <div className="space-y-2 pt-1 text-xs text-gray-400">
              <p className="font-semibold text-gray-200">Infrastructure metrics unavailable</p>
              <p className="leading-relaxed">{widgets?.performanceMetrics?.note || "Connect an infrastructure monitoring provider to report CPU, memory, disk, network, and database connection metrics."}</p>
            </div>
            <Link href="/platform-control" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all metrics →
            </Link>
          </div>

          {/* 14. Quick Actions (6 Grid Buttons matching screenshot) */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <Link
                href="/tenants"
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-200 border border-gray-800 flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <PlusIcon className="w-4 h-4 text-blue-400" />
                <span>Add New Tenant</span>
              </Link>

              <Link
                href="/users"
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-200 border border-gray-800 flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <UserPlusIcon className="w-4 h-4 text-purple-400" />
                <span>Invite User</span>
              </Link>

              <Link
                href="/workflow-builder"
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-200 border border-gray-800 flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <CommandLineIcon className="w-4 h-4 text-amber-400" />
                <span>Create Workflow</span>
              </Link>

              <Link
                href="/social-studio"
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-200 border border-gray-800 flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                <span>Generate AI Content</span>
              </Link>

              <Link
                href="/settings"
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-200 border border-gray-800 flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                <span>System Settings</span>
              </Link>

              <Link
                href="/reports"
                className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-200 border border-gray-800 flex items-center justify-center gap-2 font-semibold transition-all"
              >
                <DocumentTextIcon className="w-4 h-4 text-cyan-400" />
                <span>View Reports</span>
              </Link>
            </div>
          </div>

          {/* 15. Top Services by Usage */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Top Services by Usage</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400">Info</span>
            </div>
            <div className="text-xs space-y-2 pt-1 text-gray-300">
              {widgets?.serviceUsage?.length ? (
                widgets.serviceUsage.map((service) => (
                  <div key={service.key}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>{service.label}</span>
                      <span className="font-bold text-white">{formatNumber(service.count)} · {formatPercent(service.percent)}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, service.percent))}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-3 text-center text-gray-500">No service activity in this period.</p>
              )}
            </div>
            <Link href="/analytics" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all services →
            </Link>
          </div>

          {/* 16. Subscription Summary (Donut Chart matching screenshot) */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">Subscription Summary</h3>
              <span className="text-[10px] font-bold text-amber-400">Billing Engine</span>
            </div>
            <div className="flex items-center justify-around gap-3 py-1">
              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-blue-500/70 bg-gray-950 text-center">
                <span className="text-lg font-black text-white">{formatNumber(widgets?.subscriptionSummary?.total)}</span>
                <span className="text-[8px] text-gray-400">Total</span>
              </div>
              <div className="text-[10px] space-y-1 text-gray-400">
                {([
                  ["Active", widgets?.subscriptionSummary?.active, "bg-blue-500"],
                  ["Trial", widgets?.subscriptionSummary?.trial, "bg-emerald-500"],
                  ["Past Due", widgets?.subscriptionSummary?.pastDue, "bg-red-500"],
                  ["Cancelled", widgets?.subscriptionSummary?.canceled, "bg-gray-500"],
                ] as const).map(([label, count, color]) => (
                  <p key={label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded ${color}`} />
                    {label}: {formatNumber(count)} ({count == null || !widgets?.subscriptionSummary?.total ? "Unavailable" : formatPercent(Number(((count / widgets.subscriptionSummary.total) * 100).toFixed(1)))})
                  </p>
                ))}
              </div>
            </div>
            <Link href="/billing" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all subscriptions →
            </Link>
          </div>

          {/* 17. License Usage */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] hover:border-blue-500/50 transition-all shadow-xl space-y-2">
            <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
              <h3 className="text-xs font-bold text-gray-200">License Usage</h3>
              <span className="text-[10px] font-bold text-emerald-400">Seat Control</span>
            </div>
            <div className="text-xs space-y-1.5 text-gray-400 pt-1">
              <p className="flex justify-between"><span>Active Licenses:</span> <strong className="text-gray-200">{formatNumber(widgets?.licenseUsage?.licenseCount)}</strong></p>
              <p className="flex justify-between"><span>Allocated Seats:</span> <strong className="text-gray-200">{formatNumber(widgets?.licenseUsage?.allocatedSeats)}</strong></p>
              <p className="flex justify-between"><span>Used Seats:</span> <strong className="text-gray-200">{formatNumber(widgets?.licenseUsage?.usedSeats)}</strong></p>
              <p className="flex justify-between"><span>Available Seats:</span> <strong className="text-gray-200">{formatNumber(widgets?.licenseUsage?.available)}</strong></p>
              <p className="flex justify-between"><span>Utilization:</span> <strong className="text-gray-200">{formatPercent(widgets?.licenseUsage?.utilization)}</strong></p>
            </div>
            <Link href="/license-management" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              Manage licenses →
            </Link>
          </div>
        </div>

        {/* ── Right Sidebar / Utility Drawer Panel matching screenshot ── */}
        <aside className="gbs-dashboard-rail xl:col-span-1 space-y-3" aria-label="Dashboard utilities">
          {/* Quick Shortcuts */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-gray-200 border-b border-gray-800/80 pb-2">
              Quick Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Link href="/global-search" className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-center font-medium text-gray-300 flex items-center justify-center gap-1.5">
                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>Global Search</span>
              </Link>
              <Link href="/organizations" className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-center font-medium text-gray-300 flex items-center justify-center gap-1.5">
                <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>Org Structure</span>
              </Link>
              <Link href="/role-simulator" className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-center font-medium text-gray-300 flex items-center justify-center gap-1.5">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>Role Simulator</span>
              </Link>
              <Link href="/crm" className="p-2.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-center font-medium text-gray-300 flex items-center justify-center gap-1.5">
                <ChartBarIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>CRM Pipeline</span>
              </Link>
            </div>
          </div>

          {/* Availability facts supported by the current authenticated request. */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-gray-200 border-b border-gray-800/80 pb-2">
              System Availability
            </h3>
            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><CommandLineIcon className="w-4 h-4 text-emerald-400" /> API Gateway</span>
                <span className="text-[10px] font-semibold text-emerald-400">{widgets?.apiHealth?.status || "Unavailable"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><DocumentTextIcon className="w-4 h-4 text-emerald-400" /> Database</span>
                <span className="text-[10px] font-semibold text-emerald-400">{widgets?.systemOverview?.databaseStatus || "Unavailable"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-purple-400" /> AI Providers</span>
                <span className="text-[10px] font-semibold text-gray-300">{formatNumber(widgets?.aiProviderStatus?.activeProviders)} configured</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><GlobeAltIcon className="w-4 h-4 text-cyan-400" /> Storage Buckets</span>
                <span className="text-[10px] font-semibold text-gray-300">{formatNumber(widgets?.storageUsage?.bucketCount)} configured</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><ShieldCheckIcon className="w-4 h-4 text-emerald-400" /> Authentication</span>
                <span className="text-[10px] font-semibold text-emerald-400">Verified request</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><UsersIcon className="w-4 h-4 text-blue-400" /> Notification Records</span>
                <span className="text-[10px] font-semibold text-gray-300">{formatNumber(widgets?.notifications?.createdInRange)} in period</span>
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-gray-500">Provider uptime is not inferred from configuration records. Connect observability to report service health.</p>
            <Link href="/platform-control" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View all services →
            </Link>
          </div>

          {/* Theme & Layout Customization matching screenshot */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-gray-200 border-b border-gray-800/80 pb-2">
              Theme & Layout
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[11px] text-gray-400 mb-1.5 font-medium">Theme</p>
                <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1.5 rounded-xl border border-gray-800">
                  <button
                    type="button"
                    onClick={() => setThemeMode("light")}
                    aria-label="Use light theme"
                    aria-pressed={themeMode === "light"}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      themeMode === "light" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <SunIcon className="w-4 h-4" /> Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("dark")}
                    aria-label="Use dark theme"
                    aria-pressed={themeMode === "dark"}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      themeMode === "dark" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <MoonIcon className="w-4 h-4" /> Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode("system")}
                    aria-label="Use system theme"
                    aria-pressed={themeMode === "system"}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      themeMode === "system" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <ComputerDesktopIcon className="w-4 h-4" /> System
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-gray-400 mb-1.5 font-medium">Primary Color</p>
                <div className="flex items-center justify-between">
                  {(["blue", "purple", "green", "cyan", "amber", "red", "gray"] as const).map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setPrimaryColor(c)}
                      aria-label={`Use ${c} as the primary color`}
                      aria-pressed={primaryColor === c}
                      className={`w-5 h-5 rounded-full transition-all border ${
                        primaryColor === c ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor:
                          c === "blue"
                            ? "#2563EB"
                            : c === "purple"
                            ? "#8B5CF6"
                            : c === "green"
                            ? "#10B981"
                            : c === "cyan"
                            ? "#06B6D4"
                            : c === "amber"
                            ? "#F59E0B"
                            : c === "red"
                            ? "#EF4444"
                            : "#6B7280",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] text-gray-400 mb-1.5 font-medium">Layout</p>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setSelectedLayout(l)}
                      aria-label={`Use dashboard layout ${l}`}
                      aria-pressed={selectedLayout === l}
                      className={`p-2 rounded-lg bg-gray-950 border flex items-center justify-center transition-all ${
                        selectedLayout === l ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-800 opacity-60"
                      }`}
                    >
                      <div className="w-6 h-4 border border-gray-600 rounded flex gap-0.5 p-0.5">
                        <div className="w-1.5 h-full bg-blue-500 rounded-sm" />
                        <div className="flex-1 h-full bg-gray-700 rounded-sm" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Platform Information matching screenshot */}
          <div className="p-4 rounded-2xl bg-[#111C38] border border-[#1E2D54] shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-gray-200 border-b border-gray-800/80 pb-2">
              Platform Information
            </h3>
            <div className="text-xs space-y-1.5 text-gray-400">
              <p className="flex justify-between gap-3"><span>Environment:</span> <strong className="text-gray-200">{widgets?.systemOverview?.nodeEnv || "Unavailable"}</strong></p>
              <p className="flex justify-between gap-3"><span>Region:</span> <strong className="text-gray-200">{widgets?.systemOverview?.region || "Not configured"}</strong></p>
              <p className="flex justify-between gap-3"><span>Version:</span> <strong className="text-gray-200">{widgets?.systemOverview?.version || "Unavailable"}</strong></p>
              <p className="flex justify-between gap-3"><span>Observed:</span> <strong className="text-right text-gray-200">{formatObservedAt(widgets?.systemOverview?.observedAt)}</strong></p>
            </div>
            <Link href="/developer-portal" className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 block pt-1">
              View release notes →
            </Link>
          </div>
        </aside>
      </div>

      {/* ── Footer matching screenshot ── */}
      <div className="gbs-dashboard-footer pt-4 border-t border-gray-800/80 flex flex-wrap items-center justify-end gap-3 text-[11px] text-gray-500">
        <a href={`${WEB_PORTAL_URL}/privacy`} className="hover:text-gray-300">Privacy Policy</a>
        <span>|</span>
        <a href={`${WEB_PORTAL_URL}/terms`} className="hover:text-gray-300">Terms of Service</a>
        <span>|</span>
        <a href={`${WEB_PORTAL_URL}/contact`} className="hover:text-gray-300">Support</a>
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* ── MODALS FOR ALL ACTIONS ── */}
      {/* -------------------------------------------------------------------------- */}

      {/* 1. Add Widget Modal */}
      {addWidgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#111C38] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">Add Enterprise Control Widget</h3>
              <button onClick={() => setAddWidgetModalOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400">Select an enterprise telemetry widget to add to your admin control center:</p>
            <div className="grid grid-cols-2 gap-2">
              {ADDABLE_WIDGETS.map((widget) => (
                <button
                  key={widget.id}
                  type="button"
                  onClick={() => addDashboardWidget(widget.id)}
                  disabled={addedWidgetIds.includes(widget.id)}
                  aria-pressed={addedWidgetIds.includes(widget.id)}
                  className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-blue-500 text-left font-semibold text-gray-200 transition-all"
                >
                  {addedWidgetIds.includes(widget.id) ? "Added: " : "Add: "}
                  {widget.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Configure Widgets Modal */}
      {configureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111C38] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">Configure Dashboard Widgets</h3>
              <button onClick={() => setConfigureModalOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400">Choose which core widgets are visible on this dashboard:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {CONFIGURABLE_WIDGETS.map((widget) => (
                <label key={widget.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-900/60 border border-gray-800 text-gray-200">
                  <span>{widget.label}</span>
                  <input
                    type="checkbox"
                    checked={draftVisibleWidgetIds.includes(widget.id)}
                    onChange={(event) => {
                      setDraftVisibleWidgetIds((current) =>
                        event.target.checked
                          ? [...current, widget.id]
                          : current.filter((id) => id !== widget.id),
                      );
                    }}
                    className="rounded accent-blue-600"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={saveWidgetConfiguration}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white transition-all text-xs"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* 3. Export Snapshot Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111C38] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">Export Dashboard Snapshot</h3>
              <button onClick={() => setExportModalOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400">Select export format for real-time telemetry metrics:</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => downloadSnapshot("json")}
                className="flex-1 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500 text-amber-400 font-bold"
              >
                📄 Download JSON
              </button>
              <button
                type="button"
                onClick={() => downloadSnapshot("csv")}
                className="flex-1 py-3 rounded-xl bg-gray-900 border border-gray-800 hover:border-amber-500 text-amber-400 font-bold"
              >
                📊 Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
