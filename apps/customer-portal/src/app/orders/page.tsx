"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { ShoppingBagIcon, TruckIcon, DocumentCheckIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatMoney } from "@/lib/format";

type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  trackingNumber: string | null;
  total: number;
  currency: string;
};

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<{ orders: CustomerOrder[] }>("/api/v1/customer/orders", token);
      setOrders(data.orders || []);
    } catch (reason) {
      setOrders([]);
      setError(reason instanceof Error ? reason.message : "Orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ShoppingBagIcon className="h-7 w-7 text-indigo-600" /> Orders & Tracking
          </h1>
          <p className="text-sm text-gray-500">Track persisted purchases and fulfillment records.</p>
          <p role="note" className="mt-2 text-xs text-amber-700">
            Invoice downloads are not configured for customer-order records. Issued invoices are available from Payments when a real invoice PDF URL exists.
          </p>
        </div>

        {loading ? (
          <LoadingState label="Loading orders..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadOrders()} />
        ) : orders.length ? (
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Tracking ID</th>
                  <th className="p-4">Total</th>
                  <th className="p-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-bold text-gray-900">{order.orderNumber}</td>
                    <td className="p-4"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">{order.status}</span></td>
                    <td className="p-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">{order.paymentStatus}</span></td>
                    <td className="p-4 font-mono text-xs text-gray-600">
                      <span className="flex items-center gap-1"><TruckIcon className="h-4 w-4 text-indigo-500" /> {order.trackingNumber || "Not assigned"}</span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">{formatMoney(order.total, order.currency)}</td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="No invoice download endpoint is available for customer orders."
                        className="inline-flex cursor-not-allowed items-center gap-1 text-xs font-medium text-gray-400"
                      >
                        <DocumentCheckIcon className="h-4 w-4" /> Invoice unavailable
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No orders" description="No customer-order records exist for this account." />
        )}
      </div>
    </DashboardLayout>
  );
}
