"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function LeadManagementPage() {
  const { token } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // New Lead Modal
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [source, setSource] = useState("WEBSITE_FORM");

  const fetchLeads = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/v1/crm/leads?search=${search}&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [token, search, statusFilter]);

  const handleCaptureLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) return;
    try {
      const res = await fetch(`${API}/api/v1/crm/leads/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone, companyName, jobTitle, source }),
      });
      if (res.ok) {
        alert("Lead captured successfully!");
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setCompanyName("");
        setJobTitle("");
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConvertLead = async (id: string, name: string) => {
    if (!confirm(`Convert ${name} to Contact and Sales Opportunity?`)) return;
    try {
      const res = await fetch(`${API}/api/v1/crm/leads/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dealTitle: `${name}'s License Expansion`, dealValue: 15000 }),
      });
      if (res.ok) {
        alert("Lead successfully converted to Contact & Sales Opportunity!");
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecalculateScore = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/v1/crm/leads/${id}/score`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchLeads();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Lead Management & AI Scoring</h1>
          <p className="mt-1 text-sm text-gray-400">
            Multi-channel lead capture, AI predictive scoring, lead routing, and 1-click sales conversion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Directory & Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">Captured Leads ({leads.length})</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded-xl px-3 py-1.5 text-xs w-full sm:w-48"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="CONVERTED">Converted</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No leads captured yet. Use the form to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-gray-400 font-semibold uppercase">
                    <th className="py-2.5 px-3">Lead Name</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">AI Score</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-bold text-gray-900">
                        {l.firstName} {l.lastName}
                        <div className="text-[10px] text-gray-400 font-normal">{l.email}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-700">{l.companyName || "Personal"}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">
                          {l.source}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          l.score >= 75 ? "bg-emerald-100 text-emerald-800" : l.score >= 50 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                        }`}>
                          {l.score}/100
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-800">{l.status}</td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleRecalculateScore(l.id)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-[11px]"
                        >
                          Recalc AI
                        </button>
                        {l.status !== "CONVERTED" && (
                          <button
                            onClick={() => handleConvertLead(l.id, `${l.firstName} ${l.lastName || ""}`)}
                            className="px-2.5 py-1 rounded-lg bg-[#D4AF37] hover:bg-amber-400 text-gray-950 font-bold text-[11px]"
                          >
                            Convert
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Capture New Lead Form */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Capture New Lead</h2>
          <form onSubmit={handleCaptureLead} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">First Name *</label>
              <input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Last Name</label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Email Address *</label>
              <input
                type="email"
                placeholder="john@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Company Name</label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Lead Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              >
                <option value="WEBSITE_FORM">Website Form</option>
                <option value="LANDING_PAGE">Landing Page</option>
                <option value="SOCIAL_MEDIA">Social Media</option>
                <option value="GOOGLE_BUSINESS">Google Business</option>
                <option value="MANUAL">Manual Entry</option>
                <option value="API">API Lead</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-gray-950 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors"
            >
              Add Lead Record
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
