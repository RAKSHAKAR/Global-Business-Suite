"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function OrganizationsPage() {
  const { token } = useAuth();
  const [tree, setTree] = useState<any[]>([]);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [bulkCsv, setBulkCsv] = useState("");

  const fetchData = async () => {
    if (!token) return;
    try {
      const [tRes, gRes] = await Promise.all([
        fetch(`${API}/api/v1/admin/org/tree`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/admin/org/user-groups`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (tRes.ok) setTree((await tRes.json()).organizations);
      if (gRes.ok) setUserGroups((await gRes.json()).userGroups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgCode) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/org/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: orgName, code: orgCode }),
      });
      if (res.ok) {
        setOrgName("");
        setOrgCode("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/org/user-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: groupName }),
      });
      if (res.ok) {
        setGroupName("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkCsv.trim()) return;
    const lines = bulkCsv.trim().split("\n");
    const users = lines.map(line => {
      const [email, firstName, lastName] = line.split(",").map(s => s.trim());
      return { email, firstName, lastName };
    }).filter(u => u.email);

    try {
      const res = await fetch(`${API}/api/v1/admin/org/users/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ users }),
      });
      if (res.ok) {
        alert(`Successfully imported ${users.length} users!`);
        setBulkCsv("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Organization & Team Hierarchy</h1>
          <p className="mt-1 text-sm text-gray-400">
            Multi-level hierarchy: Organizations → Branches → Departments → Teams & User Groups.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Org Tree View */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Enterprise Hierarchy Tree</h2>

          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading hierarchy...</div>
          ) : tree.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No organizations created yet. Add one below.</div>
          ) : (
            <div className="space-y-4">
              {tree.map((org) => (
                <div key={org.id} className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{org.name} <code className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700">{org.code}</code></span>
                    <span className="text-xs text-gray-500">{org.branches?.length || 0} Branches</span>
                  </div>
                  {org.branches?.map((branch: any) => (
                    <div key={branch.id} className="ml-4 pl-4 border-l-2 border-blue-500 py-1 text-sm">
                      <p className="font-semibold text-gray-800">└ Branch: {branch.name} ({branch.code})</p>
                      {branch.departments?.map((dept: any) => (
                        <div key={dept.id} className="ml-4 pl-4 border-l-2 border-purple-400 text-xs text-gray-600">
                          └ Dept: {dept.name} ({dept.teams?.length || 0} teams)
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Create Org Form */}
          <form onSubmit={handleCreateOrg} className="pt-4 border-t border-gray-100 flex gap-3">
            <input
              type="text"
              placeholder="Org Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="flex-1 border rounded-xl px-3 py-2 text-sm"
              required
            />
            <input
              type="text"
              placeholder="CODE"
              value={orgCode}
              onChange={(e) => setOrgCode(e.target.value)}
              className="w-28 border rounded-xl px-3 py-2 text-sm uppercase"
              required
            />
            <button type="submit" className="bg-[#D4AF37] text-gray-950 font-bold px-4 py-2 rounded-xl text-sm">
              Add Org
            </button>
          </form>
        </div>

        {/* User Groups & Bulk Import */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">User Groups</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {userGroups.map((g) => (
                <div key={g.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex justify-between text-xs font-semibold">
                  <span>{g.name}</span>
                  <span className="text-gray-500">Group</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleCreateGroup} className="flex gap-2">
              <input
                type="text"
                placeholder="New Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="flex-1 border rounded-xl px-3 py-1.5 text-xs"
                required
              />
              <button type="submit" className="bg-gray-900 text-white font-semibold px-3 py-1.5 rounded-xl text-xs">
                Create
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Bulk Import Users (CSV)</h2>
            <textarea
              rows={4}
              placeholder="email,firstName,lastName&#10;john@example.com,John,Doe"
              value={bulkCsv}
              onChange={(e) => setBulkCsv(e.target.value)}
              className="w-full border rounded-xl p-3 text-xs font-mono"
            />
            <button
              onClick={handleBulkImport}
              className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-blue-700"
            >
              Run Bulk Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
