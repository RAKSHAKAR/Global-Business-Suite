"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

type ApprovalWorkflow = {
  id: string;
  name: string;
  triggerType: string;
  description: string | null;
  isActive: boolean;
  steps: { id: string; stepNumber: number; title: string; requiredRole: string }[];
  _count?: { requests: number };
};

export default function ApprovalWorkflowsPage() {
  const { token } = useAuth();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("REGISTRATION");
  const [description, setDesc] = useState("");
  const [requiredRole, setRequiredRole] = useState("SUPER_ADMIN");

  const fetchWorkflows = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/v1/approval-workflows`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/approval-workflows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          triggerType,
          description,
          steps: [{ stepNumber: 1, title: `${triggerType} Approval Step 1`, requiredRole }],
        }),
      });
      if (!res.ok) throw new Error("Failed to create workflow");
      setIsOpen(false);
      setName("");
      setDesc("");
      fetchWorkflows();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Approval Workflows
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure multi-step authorization approval chains for platform activities
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="shrink-0 bg-gray-900 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          + New Workflow
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
              No approval workflows defined.
            </div>
          ) : (
            workflows.map((wf) => (
              <div key={wf.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <h3 className="font-bold text-gray-900 text-lg">{wf.name}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase">
                      {wf.triggerType}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {wf._count?.requests || 0} Total Requests
                  </span>
                </div>
                <p className="text-sm text-gray-600">{wf.description || "No description provided."}</p>
                <div className="pt-2 flex flex-wrap gap-2">
                  {wf.steps.map((step) => (
                    <span key={step.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                      Step {step.stepNumber}: {step.title} ({step.requiredRole})
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">New Approval Workflow</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Workflow Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Partner Registration Approval" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Trigger Type</label>
                <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="REGISTRATION">Registration</option>
                  <option value="PARTNER_ONBOARDING">Partner Onboarding</option>
                  <option value="POST_PUBLISH">Content Publishing</option>
                  <option value="BILLING_REFUND">Billing & Refund</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Required Approver Role</label>
                <select value={requiredRole} onChange={(e) => setRequiredRole(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="SYSTEM_ADMIN">System Admin</option>
                  <option value="PARTNER_ADMIN">Partner Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Description</label>
                <textarea rows={2} value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Workflow details..." className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-gray-900 text-white font-medium text-sm rounded-xl hover:bg-gray-800 disabled:opacity-50">{saving ? "Saving..." : "Create Workflow"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
