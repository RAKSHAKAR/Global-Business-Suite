"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function BillingPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Coupon state
  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");

  const fetchData = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/billing-engine/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const resData = await res.json();
        setData(resData.billingOverview);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/billing-engine/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, discountType, discountValue }),
      });
      if (res.ok) {
        alert("Coupon created successfully!");
        setCode("");
        setDiscountValue("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Subscriptions & Billing Administration</h1>
          <p className="mt-1 text-sm text-gray-400">
            Subscription plans, pricing tiers, discounts, coupons, invoices, and usage add-ons.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Revenue</p>
          <p className="text-3xl font-black text-[#D4AF37] mt-1">${data?.totalRevenue?.toLocaleString() || "48,500"}</p>

        </div>
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Active Subscriptions</p>
          <p className="text-3xl font-black text-blue-600 mt-1">{data?.activeSubscriptionsCount ?? 0}</p>

        </div>
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Subscription Plans</p>
          <p className="text-3xl font-black text-purple-600 mt-1">{data?.plansCount ?? 0}</p>

        </div>
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">Active Coupons</p>
          <p className="text-3xl font-black text-green-600 mt-1">{data?.couponsCount ?? 0}</p>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plans & Subscriptions */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Subscription Plans Matrix</h2>
          <div className="space-y-3">
            {data?.plans?.map((plan: any) => (
              <div key={plan.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{plan.name}</h3>
                  <p className="text-xs text-gray-500">{plan.description || "Enterprise Plan"}</p>
                </div>
                <span className="text-lg font-black text-gray-900">${plan.price}/mo</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coupons Manager */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Create Discount Coupon</h2>
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Coupon Code</label>
              <input
                type="text"
                placeholder="e.g. GBSPROMO20"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm uppercase mt-1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm mt-1"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700">Value</label>
                <input
                  type="number"
                  placeholder="20"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm mt-1"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-[#D4AF37] text-gray-950 font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400"
            >
              Generate Coupon Code
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
