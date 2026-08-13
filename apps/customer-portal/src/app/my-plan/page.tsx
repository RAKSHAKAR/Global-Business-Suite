"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircleIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

type Plan = { id: string; name: string; description: string | null; price: number; currency: string; interval: string; featuresJson: string; limitsJson: string };
type Subscription = { id: string; status: string; billingCycle: string; currentPeriodStart: string; currentPeriodEnd: string; trialEnd: string | null; autoRenew: boolean; cancelAtPeriodEnd: boolean; plan: Plan };

function parseFeatures(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
}

export default function MyPlanPage() {
  const { token } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return; setLoading(true); setError("");
    try {
      const [current, available] = await Promise.all([
        apiRequest<Subscription | null>("/api/v1/billing/subscriptions", token),
        apiRequest<Plan[]>("/api/v1/billing/plans", token),
      ]);
      setSubscription(current); setPlans(available);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Subscription data is unavailable."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const alternatives = useMemo(() => plans.filter((plan) => plan.id !== subscription?.plan.id), [plans, subscription]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><CreditCardIcon className="h-7 w-7 text-blue-600" /> My plan</h1><p className="mt-1 text-sm text-gray-500">Your tenant subscription and available published plans.</p></header>
        {loading ? <LoadingState label="Loading subscription..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error ? <>
          {subscription ? <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Current subscription</p><h2 className="mt-1 text-3xl font-bold text-gray-900">{subscription.plan.name}</h2><p className="mt-2 max-w-2xl text-sm text-gray-500">{subscription.plan.description || "No plan description has been provided."}</p></div><div className="self-start rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">{subscription.status}</div></div><dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><PlanDetail label="Price" value={`${formatMoney(subscription.plan.price, subscription.plan.currency)} / ${subscription.plan.interval.toLowerCase()}`} /><PlanDetail label="Billing cycle" value={subscription.billingCycle} /><PlanDetail label="Current period ends" value={formatDate(subscription.currentPeriodEnd)} /><PlanDetail label="Renewal" value={subscription.cancelAtPeriodEnd ? "Ends after this period" : subscription.autoRenew ? "Auto-renew enabled" : "Manual renewal"} /></dl>{parseFeatures(subscription.plan.featuresJson).length ? <div className="mt-6"><h3 className="font-semibold text-gray-900">Included features</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{parseFeatures(subscription.plan.featuresJson).map((feature) => <li key={feature} className="flex gap-2 text-sm text-gray-600"><CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />{feature}</li>)}</ul></div> : <p className="mt-6 text-sm text-gray-500">No feature list has been published for this plan.</p>}</section> : <EmptyState title="No active subscription" description="This tenant does not have a subscription record. Select a published plan with your account team." action={<Link href="/support" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Contact support</Link>} />}

          <section><h2 className="text-lg font-bold text-gray-900">Available plans</h2>{alternatives.length ? <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{alternatives.map((plan) => <article key={plan.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-bold text-gray-900">{plan.name}</h3><p className="mt-2 text-2xl font-bold text-blue-700">{formatMoney(plan.price, plan.currency)} <span className="text-sm font-normal text-gray-500">/ {plan.interval.toLowerCase()}</span></p><p className="mt-3 text-sm text-gray-500">{plan.description || "No description provided."}</p><Link href="/support" className="mt-5 inline-flex text-sm font-semibold text-blue-600">Request plan change</Link></article>)}</div> : <div className="mt-3"><EmptyState title="No other published plans" description="Administrators have not published another active plan." /></div>}</section>
        </> : null}
      </div>
    </DashboardLayout>
  );
}

function PlanDetail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-gray-50 p-4"><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 font-semibold text-gray-900">{value}</dd></div>; }
