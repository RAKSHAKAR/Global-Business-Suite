"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext";
import {
  GlobeAltIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

const API = "http://localhost:4000";

// Platform display config
const PLATFORM_META: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  FACEBOOK:         { label: "Facebook",         color: "text-blue-400",    bg: "bg-blue-400/10",    emoji: "📘" },
  INSTAGRAM:        { label: "Instagram",         color: "text-pink-400",    bg: "bg-pink-400/10",    emoji: "📸" },
  LINKEDIN:         { label: "LinkedIn",          color: "text-sky-400",     bg: "bg-sky-400/10",     emoji: "💼" },
  TWITTER_X:        { label: "X / Twitter",       color: "text-gray-300",    bg: "bg-gray-400/10",    emoji: "𝕏" },
  TIKTOK:           { label: "TikTok",            color: "text-red-400",     bg: "bg-red-400/10",     emoji: "🎵" },
  PINTEREST:        { label: "Pinterest",          color: "text-rose-400",    bg: "bg-rose-400/10",    emoji: "📌" },
  THREADS:          { label: "Threads",            color: "text-purple-400",  bg: "bg-purple-400/10",  emoji: "🧵" },
  YOUTUBE:          { label: "YouTube",            color: "text-red-500",     bg: "bg-red-500/10",     emoji: "▶️" },
  GOOGLE_BUSINESS:  { label: "Google Business",   color: "text-green-400",   bg: "bg-green-400/10",   emoji: "🏢" },
};

type SocialChannel = {
  id: string;
  tenantId: string;
  tenantName?: string;
  platform: string;
  accountName: string;
  accountId: string;
  isActive: boolean;
  tokenExpiresAt: string | null;
  createdAt: string;
};

type Stats = {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
};

function getTokenStatus(expiresAt: string | null): "ok" | "expiring" | "expired" | "never" {
  if (!expiresAt) return "never";
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  if (exp < now) return "expired";
  if (exp - now < 7 * 24 * 60 * 60 * 1000) return "expiring"; // < 7 days
  return "ok";
}

function TokenBadge({ expiresAt }: { expiresAt: string | null }) {
  const status = getTokenStatus(expiresAt);
  if (status === "never") return <span className="text-xs text-gray-500">No expiry</span>;
  if (status === "expired") return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <XCircleIcon className="w-3.5 h-3.5" /> Expired
    </span>
  );
  if (status === "expiring") return (
    <span className="flex items-center gap-1 text-xs text-amber-400">
      <ExclamationTriangleIcon className="w-3.5 h-3.5" />
      Expiring {new Date(expiresAt!).toLocaleDateString()}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-green-400">
      <CheckCircleIcon className="w-3.5 h-3.5" />
      Valid to {new Date(expiresAt!).toLocaleDateString()}
    </span>
  );
}

export default function SocialChannelsPage() {
  const { token } = useAuth();
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, expiringSoon: 0, expired: 0 });

  const fetchChannels = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/social-channels`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: SocialChannel[] = data.data || [];
        setChannels(list);

        // Compute stats
        const now = Date.now();
        setStats({
          total: list.length,
          active: list.filter((c) => c.isActive).length,
          expiringSoon: list.filter((c) => {
            if (!c.tokenExpiresAt) return false;
            const exp = new Date(c.tokenExpiresAt).getTime();
            return exp > now && exp - now < 7 * 24 * 60 * 60 * 1000;
          }).length,
          expired: list.filter((c) => {
            if (!c.tokenExpiresAt) return false;
            return new Date(c.tokenExpiresAt).getTime() < now;
          }).length,
        });
      }
    } catch (err) {
      console.error("[admin:social-channels]", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const revokeChannel = async (id: string, accountName: string) => {
    if (!confirm(`Revoke access for "${accountName}"? This cannot be undone.`)) return;
    setRevoking(id);
    try {
      await fetch(`${API}/api/v1/admin/social-channels/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("[admin:revoke]", err);
    } finally {
      setRevoking(null);
    }
  };

  const filtered = channels.filter((c) => {
    const matchSearch =
      !search ||
      c.accountName.toLowerCase().includes(search.toLowerCase()) ||
      (c.tenantName || "").toLowerCase().includes(search.toLowerCase()) ||
      c.platform.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === "ALL" || c.platform === platformFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && c.isActive) ||
      (statusFilter === "INACTIVE" && !c.isActive) ||
      (statusFilter === "EXPIRED" && getTokenStatus(c.tokenExpiresAt) === "expired") ||
      (statusFilter === "EXPIRING" && getTokenStatus(c.tokenExpiresAt) === "expiring");
    return matchSearch && matchPlatform && matchStatus;
  });

  const platforms = Array.from(new Set(channels.map((c) => c.platform)));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GlobeAltIcon className="w-7 h-7 text-blue-400" />
            Social Channel Oversight
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Monitor and manage all tenant social media connections across the platform.
          </p>
        </div>
        <button
          onClick={fetchChannels}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Channels", value: stats.total, color: "text-white",      bg: "bg-gray-800" },
          { label: "Active",         value: stats.active, color: "text-green-400",  bg: "bg-green-400/10 border border-green-400/20" },
          { label: "Expiring Soon",  value: stats.expiringSoon, color: "text-amber-400", bg: "bg-amber-400/10 border border-amber-400/20" },
          { label: "Expired",        value: stats.expired, color: "text-red-400",   bg: "bg-red-400/10 border border-red-400/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.bg}`}>
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by account, tenant, or platform…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700
                       text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <FunnelIcon className="w-4 h-4 text-gray-500" />
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded-lg px-3 py-2.5
                       focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{PLATFORM_META[p]?.label ?? p}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded-lg px-3 py-2.5
                       focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="EXPIRING">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 border-b border-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Tenant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Token Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Connected</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-800 rounded w-24" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-800 rounded w-32" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-gray-800 rounded w-28" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-800 rounded w-24" /></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-800 rounded w-16" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-gray-800 rounded w-20" /></td>
                  <td className="px-4 py-3 text-right"><div className="h-4 bg-gray-800 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-500">
                  <GlobeAltIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No social channels found</p>
                  {(search || platformFilter !== "ALL" || statusFilter !== "ALL") && (
                    <button
                      onClick={() => { setSearch(""); setPlatformFilter("ALL"); setStatusFilter("ALL"); }}
                      className="mt-2 text-xs text-blue-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((ch) => {
                const meta = PLATFORM_META[ch.platform] ?? { label: ch.platform, color: "text-gray-300", bg: "bg-gray-700", emoji: "🌐" };
                return (
                  <tr key={ch.id} className="hover:bg-gray-900/50 transition-colors">
                    {/* Platform */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                        <span>{meta.emoji}</span>
                        {meta.label}
                      </span>
                    </td>

                    {/* Account */}
                    <td className="px-4 py-3">
                      <p className="text-white font-medium truncate max-w-[160px]">{ch.accountName}</p>
                      <p className="text-gray-500 text-xs truncate max-w-[160px]">ID: {ch.accountId}</p>
                    </td>

                    {/* Tenant */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-gray-300 text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">
                        {ch.tenantName ?? ch.tenantId.slice(0, 8) + "…"}
                      </span>
                    </td>

                    {/* Token */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <TokenBadge expiresAt={ch.tokenExpiresAt} />
                    </td>

                    {/* Active */}
                    <td className="px-4 py-3">
                      {ch.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-700/50 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Connected date */}
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {new Date(ch.createdAt).toLocaleDateString()}
                    </td>

                    {/* Revoke */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => revokeChannel(ch.id, ch.accountName)}
                        disabled={revoking === ch.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                   text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20
                                   hover:border-red-400/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {revoking === ch.id ? (
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <TrashIcon className="w-3.5 h-3.5" />
                        )}
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer row count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 bg-gray-900 border-t border-gray-800 text-xs text-gray-500">
            Showing {filtered.length} of {channels.length} channels
          </div>
        )}
      </div>

      {/* Platform Health Summary */}
      {!loading && channels.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Platform Distribution</h2>
          <div className="flex flex-wrap gap-3">
            {platforms.map((p) => {
              const count = channels.filter((c) => c.platform === p).length;
              const meta = PLATFORM_META[p] ?? { label: p, color: "text-gray-300", bg: "bg-gray-700", emoji: "🌐" };
              return (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(platformFilter === p ? "ALL" : p)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all
                    ${platformFilter === p
                      ? `${meta.bg} ${meta.color} border-current`
                      : "bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-500"
                    }`}
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
