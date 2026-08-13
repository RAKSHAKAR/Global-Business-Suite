"use client";

import React, { useEffect, useState } from "react";

const PLATFORM_TABS = [
  "NOTIFICATIONS",
  "WORKFLOWS",
  "AUTOMATION",
  "INTEGRATIONS",
  "MONITORING",
  "SECURITY",
  "BACKUP",
  "COMPLIANCE",
] as const;

type PlatformTab = (typeof PLATFORM_TABS)[number];

function isPlatformTab(value: string | null): value is PlatformTab {
  return PLATFORM_TABS.includes(value as PlatformTab);
}

export default function PlatformControlPage() {
  const [activeTab, setActiveTab] = useState<PlatformTab>("NOTIFICATIONS");

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search)
      .get("tab")
      ?.toUpperCase() ?? null;

    if (isPlatformTab(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, []);

  const selectTab = (tab: PlatformTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Platform Control Center</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Phase 16 Enterprise Operations
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Centralized platform services, automation workflows, multi-channel notifications, observability, security & DR runbooks.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto gap-2 border-b border-gray-800 pb-2" role="tablist" aria-label="Platform control sections">
          {[
            { key: "NOTIFICATIONS", label: "Notification Center" },
            { key: "WORKFLOWS", label: "Visual Workflow Designer" },
            { key: "AUTOMATION", label: "Automation & Queue" },
            { key: "INTEGRATIONS", label: "Connectors & SSO" },
            { key: "MONITORING", label: "System Health Telemetry" },
            { key: "SECURITY", label: "Security & Threat Ops" },
            { key: "BACKUP", label: "Backup & DR Manager" },
            { key: "COMPLIANCE", label: "Compliance & GDPR" },
          ].map((tab) => (
            <button
              key={tab.key}
              role="tab"
              onClick={() => selectTab(tab.key as PlatformTab)}
              aria-selected={activeTab === tab.key}
              className={`px-4 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        {activeTab === "NOTIFICATIONS" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-4">
              <h3 className="text-sm font-semibold text-white">Supported Dispatch Channels (11)</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                <span className="p-2 bg-gray-950 rounded border border-gray-800">Email</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">SMS</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">WhatsApp</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">Push</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">Browser</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">In-App</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">Slack</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">MS Teams</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">Telegram</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800">Discord</span>
                <span className="p-2 bg-gray-950 rounded border border-gray-800 col-span-2">Webhooks</span>
              </div>
            </div>
            <div className="md:col-span-2 bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-3">
              <h3 className="text-sm font-semibold text-white">Multi-Channel Delivery & Fallback Logs</h3>
              <div className="text-xs text-gray-400 space-y-2">
                <div className="p-3 bg-gray-950 rounded border border-gray-800 flex justify-between items-center">
                  <div>
                    <span className="text-white font-medium">[WHATSAPP] Welcome Onboarding</span>
                    <p className="text-[11px] text-gray-500">Recipient: +1-555-0192 • Status: DELIVERED • Fallback: EMAIL</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">DELIVERED</span>
                </div>
                <div className="p-3 bg-gray-950 rounded border border-gray-800 flex justify-between items-center">
                  <div>
                    <span className="text-white font-medium">[SLACK] High Priority Security Alert</span>
                    <p className="text-[11px] text-gray-500">Channel: #security-notifications • Status: READ</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">READ</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "WORKFLOWS" && (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4">
            <h3 className="text-sm font-semibold text-white">Visual Drag & Drop Workflow Designer State</h3>
            <div className="p-4 bg-gray-950 rounded-lg border border-gray-800 flex items-center justify-between text-xs text-gray-300">
              <div>
                <span className="font-bold text-blue-400">PARTNER_REGISTRATION_FLOW (v3)</span>
                <p className="text-gray-400 mt-1">Nodes: 5 (Trigger -&gt; KYC Verification -&gt; AI Risk Score -&gt; Multi-Level Approval -&gt; Notification)</p>
              </div>
              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">ACTIVE</span>
            </div>
          </div>
        )}

        {activeTab === "AUTOMATION" && (
          <section
            aria-labelledby="automation-operations-title"
            className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4"
          >
            <div>
              <h2 id="automation-operations-title" className="text-sm font-semibold text-white">
                Job, Queue & Cron Operations
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Build scheduled automations, manage AI workflows, or inspect live platform health from the dedicated operations tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/workflow-builder" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500">
                Open Automation Builder
              </a>
              <a href="/ai-workflows" className="rounded-lg border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800">
                Open AI Workflows
              </a>
              <a href="/platform-control?tab=MONITORING" className="rounded-lg border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800">
                View System Health
              </a>
            </div>
          </section>
        )}

        {activeTab === "MONITORING" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400">Uptime</span>
              <p className="text-xl font-bold text-white mt-1">99.99%</p>
            </div>
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400">Database SLA</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">2 ms Latency</p>
            </div>
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400">Queue Processing</span>
              <p className="text-xl font-bold text-blue-400 mt-1">0 Backlog</p>
            </div>
            <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
              <span className="text-xs text-gray-400">Security Threat Level</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">NORMAL (0 active)</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
