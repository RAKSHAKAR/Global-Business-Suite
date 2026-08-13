"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCardIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

type Invoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  pdfUrl: string | null;
};

const outstandingStatuses = new Set(["OPEN", "UNPAID", "OVERDUE", "PAST_DUE"]);

export default function PaymentsPage() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      setInvoices(await apiRequest<Invoice[]>("/api/v1/billing/invoices", token));
    } catch (loadError) {
      setInvoices([]);
      setError(loadError instanceof Error ? loadError.message : "Invoice data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const outstanding = useMemo(
    () => invoices.filter((invoice) => outstandingStatuses.has(invoice.status)),
    [invoices],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <CreditCardIcon className="h-7 w-7 text-emerald-600" /> Payments &amp; invoices
            </h1>
            <p className="mt-1 text-sm text-gray-500">Tenant billing records from the platform ledger.</p>
          </div>
          <button type="button" onClick={() => void load()} className="self-start rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Refresh
          </button>
        </header>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Online collection is unavailable until an administrator configures a live payment gateway. This page does not mark an invoice paid without confirmation from that provider.
        </div>

        {loading ? <LoadingState label="Loading billing records..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">Invoices</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-500">Outstanding</p>
                <p className="mt-2 text-3xl font-bold text-amber-700">{outstanding.length}</p>
              </div>
            </section>

            {invoices.length ? (
              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Document</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-5 py-4 font-semibold text-gray-900">{invoice.invoiceNumber}</td>
                          <td className="px-5 py-4 text-gray-600">{formatDate(invoice.dueDate)}</td>
                          <td className="px-5 py-4 font-semibold text-gray-900">{formatMoney(invoice.amount, invoice.currency)}</td>
                          <td className="px-5 py-4"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{invoice.status}</span></td>
                          <td className="px-5 py-4 text-right">
                            {invoice.pdfUrl ? (
                              <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700">
                                <DocumentArrowDownIcon className="h-4 w-4" /> View PDF
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">Not generated</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <EmptyState title="No invoices" description="There are no invoice records for this tenant." />
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
