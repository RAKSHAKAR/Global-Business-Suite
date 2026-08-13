"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  CreditCardIcon,
  MapPinIcon,
  MegaphoneIcon,
  PhotoIcon,
  ReceiptPercentIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { useAuth } from "./AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  pdfUrl: string | null;
};

type DashboardSummary = {
  source: "TENANT_DATABASE";
  subscription: null | {
    id: string;
    status: string;
    currentPeriodEnd: string;
    trialEnd: string | null;
    plan: { name: string; price: number; currency: string; interval: string };
  };
  recentInvoices: Invoice[];
  counts: {
    orders: number;
    upcomingAppointments: number;
    openTickets: number;
    documents: number;
    googleLocations: number;
    reviews: number;
  };
  reviewAverage: number | null;
};

type GoogleDashboard = {
  isConnected: boolean;
  connectionRequired: boolean;
  marketingScore: number;
  performance: { totals: { views: number; reviews: number; leads: number } };
  sync: { lastSyncedAt: string | null };
};

const outstandingStatuses = new Set(["OPEN", "UNPAID", "OVERDUE", "PAST_DUE"]);

export default function CustomerDashboard() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [google, setGoogle] = useState<GoogleDashboard | null>(null);
  const [googleNotice, setGoogleNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    setGoogleNotice("");
    try {
      const dashboard = await apiRequest<DashboardSummary>(
        "/api/v1/customer/dashboard-summary",
        token,
      );
      setSummary(dashboard);

      try {
        const googleData = await apiRequest<GoogleDashboard>("/api/v1/google/dashboard", token);
        setGoogle(googleData);
      } catch (googleError) {
        setGoogle(null);
        setGoogleNotice(
          googleError instanceof Error
            ? googleError.message
            : "Google Business data is currently unavailable.",
        );
      }
    } catch (loadError) {
      setSummary(null);
      setError(loadError instanceof Error ? loadError.message : "Dashboard data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const outstanding = useMemo(
    () => summary?.recentInvoices.filter((invoice) => outstandingStatuses.has(invoice.status)) || [],
    [summary],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Customer workspace</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Welcome{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Live subscription, billing, reputation, and Google Business status for your tenant.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="self-start rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Refresh data
          </button>
        </header>

        {loading ? <LoadingState label="Loading your tenant workspace..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && summary ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Account summary">
              <MetricCard
                icon={ReceiptPercentIcon}
                label="Current plan"
                value={summary.subscription?.plan.name || "No active plan"}
                detail={
                  summary.subscription
                    ? `${summary.subscription.status} · renews ${formatDate(summary.subscription.currentPeriodEnd)}`
                    : "Choose a plan to activate subscription services"
                }
              />
              <MetricCard
                icon={CreditCardIcon}
                label="Outstanding invoices"
                value={String(outstanding.length)}
                detail={outstanding.length ? "Payment action requires a configured gateway" : "No outstanding invoices"}
              />
              <MetricCard
                icon={StarIcon}
                label="Synchronized reviews"
                value={String(summary.counts.reviews)}
                detail={summary.reviewAverage === null ? "No rating yet" : `${summary.reviewAverage.toFixed(1)} average rating`}
              />
              <MetricCard
                icon={MapPinIcon}
                label="Google locations"
                value={String(summary.counts.googleLocations)}
                detail={google?.isConnected ? `Last sync ${formatDate(google.sync.lastSyncedAt)}` : "Google connection required"}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Google marketing tracker</h2>
                    <p className="mt-1 text-sm text-gray-500">Values come from synchronized Google Business records.</p>
                  </div>
                  <Link href="/marketing-tracker" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Open tracker
                  </Link>
                </div>

                {google?.isConnected ? (
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <SmallMetric label="Readiness" value={`${google.marketingScore}/100`} />
                    <SmallMetric label="Profile views" value={google.performance.totals.views.toLocaleString()} />
                    <SmallMetric label="Customer actions" value={google.performance.totals.leads.toLocaleString()} />
                    <SmallMetric label="Review activity" value={google.performance.totals.reviews.toLocaleString()} />
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">Google Business is not connected</p>
                    <p className="mt-1 text-sm text-amber-800">
                      {googleNotice || "Connect an approved Google Business Profile to synchronize real performance data."}
                    </p>
                    <Link href="/gbp" className="mt-3 inline-flex text-sm font-semibold text-amber-900 underline">
                      Open Google Business setup
                    </Link>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-gray-900">Operational activity</h2>
                <dl className="mt-4 grid grid-cols-2 gap-3">
                  <SmallMetric label="Orders" value={summary.counts.orders.toLocaleString()} />
                  <SmallMetric label="Upcoming appointments" value={summary.counts.upcomingAppointments.toLocaleString()} />
                  <SmallMetric label="Open support tickets" value={summary.counts.openTickets.toLocaleString()} />
                  <SmallMetric label="Documents" value={summary.counts.documents.toLocaleString()} />
                </dl>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900">Business tools</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <QuickLink href="/review-requests" icon={StarIcon} title="Review requests" description="Send through a configured provider and inspect delivery logs." />
                <QuickLink href="/google-media" icon={PhotoIcon} title="Google media" description="Manage tenant-owned location media and sync state." />
                <QuickLink href="/my-plan" icon={CreditCardIcon} title="My plan" description="View your real subscription, limits, and renewal date." />
                <QuickLink href="/marketing-tracker" icon={MegaphoneIcon} title="Marketing tracker" description="See synchronized performance and stored campaigns." />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="font-bold text-gray-900">Recent invoices</h2>
              </div>
              {summary.recentInvoices.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {summary.recentInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-5 py-4 font-semibold text-gray-900">{invoice.invoiceNumber}</td>
                          <td className="px-5 py-4 text-gray-600">{formatDate(invoice.dueDate)}</td>
                          <td className="px-5 py-4 text-gray-900">{formatMoney(invoice.amount, invoice.currency)}</td>
                          <td className="px-5 py-4 text-gray-600">{invoice.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState title="No invoices yet" description="Invoices created for this tenant will appear here." />
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof CalendarDaysIcon; label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-500"><Icon className="h-5 w-5 text-blue-600" />{label}</div>
      <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </article>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-gray-50 p-4"><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 text-xl font-bold text-gray-900">{value}</dd></div>;
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: typeof CalendarDaysIcon; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <Icon className="h-6 w-6 text-blue-600" />
      <h3 className="mt-3 font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
}
