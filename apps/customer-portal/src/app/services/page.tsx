"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { CpuChipIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

type PurchasedService = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  price: number;
  currency: string;
  interval: string;
  renewalDate: string | null;
  autoRenew: boolean;
};

type AvailablePlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
};

type ServicesData = {
  source: "BILLING_DATABASE";
  purchasedServices: PurchasedService[];
  upgradesAvailable: AvailablePlan[];
};

export default function ServicesPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadServices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const nextData = await apiRequest<ServicesData>("/api/v1/customer/services", token);
      setData({
        ...nextData,
        purchasedServices: nextData.purchasedServices || [],
        upgradesAvailable: nextData.upgradesAvailable || [],
      });
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : "Subscribed services could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <CpuChipIcon className="h-7 w-7 text-blue-600" /> My Subscribed Services
          </h1>
          <p className="text-sm text-gray-500">Review subscription and published-plan records from the billing database.</p>
          <p role="note" className="mt-2 text-xs text-amber-700">
            Upgrade, cancellation, and add-on approval workflows are not configured. No service change is performed from this page.
          </p>
        </div>

        {loading ? (
          <LoadingState label="Loading services..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadServices()} />
        ) : data ? (
          <>
            <section aria-labelledby="current-services-heading">
              <h2 id="current-services-heading" className="text-lg font-bold text-gray-900">Current subscriptions</h2>
              {data.purchasedServices.length ? (
                <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {data.purchasedServices.map((service) => (
                    <article key={service.id} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                          <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{service.status}</span>
                        </div>
                        <span className="text-xl font-extrabold text-blue-600">{formatMoney(service.price, service.currency)}</span>
                      </div>
                      <p className="text-sm text-gray-500">{service.description || "No service description has been provided."}</p>
                      <p className="text-xs text-gray-500">
                        {service.autoRenew ? "Auto-renewal date" : "Current period ends"}: {formatDate(service.renewalDate)} · {service.interval.toLowerCase()}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                        <button type="button" disabled title="Service-change approval workflow is not configured." className="cursor-not-allowed rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400">Upgrade unavailable</button>
                        <button type="button" disabled title="Service-change approval workflow is not configured." className="cursor-not-allowed rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400">Cancellation unavailable</button>
                        <Link href="/support" className="text-xs font-semibold text-blue-600 hover:underline">Contact support</Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-3"><EmptyState title="No subscribed services" description="No subscription records exist for this tenant." action={<Link href="/support" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Contact support</Link>} /></div>
              )}
            </section>

            <section aria-labelledby="available-plans-heading" className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
              <h2 id="available-plans-heading" className="font-bold text-gray-900">Published service plans</h2>
              {data.upgradesAvailable.length ? (
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {data.upgradesAvailable.map((plan) => (
                    <article key={plan.id} className="rounded-xl border border-blue-100 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
                          <p className="mt-1 text-xs text-gray-500">{plan.description || "No plan description has been provided."}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs font-bold text-emerald-600">{formatMoney(plan.price, plan.currency)} / {plan.interval.toLowerCase()}</span>
                      </div>
                      <button type="button" disabled title="Add-on approval workflow is not configured." className="mt-3 cursor-not-allowed rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400">Add-on unavailable</button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">No additional active plans are published.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
