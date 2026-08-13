"use client";

import { useState } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function RoleSimulatorPage() {
  const { token } = useAuth();
  const [targetUserId, setTargetUserId] = useState("");
  const [resource, setResource] = useState("users");
  const [action, setAction] = useState("read");
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Role Clone State
  const [sourceRoleId, setSourceRoleId] = useState("");
  const [newRoleName, setNewRoleName] = useState("");

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/roles-sim/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId, resource, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data.simulation);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceRoleId || !newRoleName) return;
    try {
      const res = await fetch(`${API}/api/v1/admin/roles-sim/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sourceRoleId, newRoleName }),
      });
      if (res.ok) {
        alert(`Role "${newRoleName}" cloned successfully!`);
        setNewRoleName("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 pt-14 md:pt-0 pb-12">
      <div className="bg-gray-950 p-6 rounded-3xl text-white shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-black text-white">Permission Simulator & Role Cloning</h1>
        <p className="mt-1 text-sm text-gray-400">
          Simulate permission evaluations for any user context and clone existing role matrices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Permission Simulator */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Permission Evaluation Simulator</h2>
          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Target User ID</label>
              <input
                type="text"
                placeholder="Enter User UUID"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Resource</label>
                <select
                  value={resource}
                  onChange={(e) => setResource(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm mt-1"
                >
                  <option value="users font">users</option>
                  <option value="tenants">tenants</option>
                  <option value="billing">billing</option>
                  <option value="ai">ai</option>
                  <option value="roles">roles</option>
                  <option value="settings">settings</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700">Action</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-sm mt-1"
                >
                  <option value="read">read</option>
                  <option value="create">create</option>
                  <option value="update">update</option>
                  <option value="delete">delete</option>
                  <option value="manage">manage</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] text-gray-950 font-bold py-2.5 rounded-xl text-sm hover:bg-amber-400"
            >
              {loading ? "Evaluating..." : "Run Permission Simulation"}
            </button>
          </form>

          {simulationResult && (
            <div className={`p-4 rounded-2xl border ${simulationResult.isAllowed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} space-y-2 text-xs`}>
              <div className="flex items-center justify-between">
                <span className="font-bold">Evaluation Outcome:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-black text-xs ${simulationResult.isAllowed ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
                  {simulationResult.isAllowed ? "ALLOWED" : "DENIED"}
                </span>
              </div>
              <p>User: <strong>{simulationResult.targetUser.email}</strong></p>
              <p>Roles: <strong>{simulationResult.assignedRoles.join(", ")}</strong></p>
              {simulationResult.matchingPermission && (
                <p className="text-gray-600">Matching Rule: <code>{JSON.stringify(simulationResult.matchingPermission)}</code></p>
              )}
            </div>
          )}
        </div>

        {/* Role Cloning */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Role Matrix Cloning</h2>
          <p className="text-xs text-gray-500">
            Duplicate all permissions from an existing source role to a new customized role.
          </p>
          <form onSubmit={handleCloneRole} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Source Role ID</label>
              <input
                type="text"
                placeholder="Source Role UUID"
                value={sourceRoleId}
                onChange={(e) => setSourceRoleId(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">New Role Name</label>
              <input
                type="text"
                placeholder="e.g. Senior Partner Manager"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-900 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-gray-800"
            >
              Clone Role Definition
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
