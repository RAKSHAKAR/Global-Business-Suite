"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DocumentTextIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

export default function WorkflowsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiRequest<any>("/api/v1/customer/workflows", token)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="w-7 h-7 text-teal-600" /> Customer Workflows & Automations
          </h1>
          <p className="text-sm text-gray-500">View active automated workflows for appointments, payments, support escalations, and subscription renewals.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading workflows...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.activeWorkflows?.map((w: any) => (
              <div key={w.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 text-base">{w.name}</h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-semibold flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> {w.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Category: {w.type} Workflow</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
