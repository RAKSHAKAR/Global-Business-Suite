"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://localhost:4000";

export default function FileManagerPage() {
  const { token } = useAuth();
  const [buckets, setBuckets] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [bRes, lRes] = await Promise.all([
        fetch(`${API}/api/v1/admin/storage/buckets`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/v1/admin/storage/backups`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (bRes.ok) setBuckets((await bRes.json()).buckets || []);
      if (lRes.ok) setBackups((await lRes.json()).backups || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleTriggerBackup = async () => {
    try {
      const res = await fetch(`${API}/api/v1/admin/storage/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "FULL" }),
      });
      if (res.ok) {
        alert("Full system backup initiated successfully!");
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
          <h1 className="text-2xl sm:text-3xl font-black text-white">Media Library & System Storage Backups</h1>
          <p className="mt-1 text-sm text-gray-400">
            Upload storage bucket allocation, media assets, database snapshot backups, and restore operations.
          </p>
        </div>
        <button
          onClick={handleTriggerBackup}
          className="bg-[#D4AF37] text-gray-950 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-400 self-start sm:self-auto"
        >
          ⚡ Trigger Full System Backup
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Buckets */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Storage Buckets Allocation</h2>
          <div className="space-y-3">
            {buckets.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">{b.bucketName} ({b.provider})</h3>
                  <span className="text-xs font-semibold text-green-600">● Default</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#D4AF37] h-full" style={{ width: `${(b.usedStorageMb / (b.maxStorageGb * 1024)) * 100}%` }} />
                </div>
                <p className="text-xs text-gray-500 text-right">{(b.usedStorageMb || 4120).toFixed(0)} MB / {b.maxStorageGb} GB</p>
              </div>
            ))}
          </div>
        </div>

        {/* System Backups */}
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Backup Logs & Snapshots</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {backups.map((bk) => (
              <div key={bk.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-900">{bk.type} Snapshot</p>
                  <span className="text-gray-400">{new Date(bk.createdAt).toLocaleString()}</span>
                </div>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">{bk.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
