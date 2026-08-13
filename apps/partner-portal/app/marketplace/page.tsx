"use client";

import React from "react";

export default function PartnerMarketplacePage() {
  return (
    <>
      <div className="p-6 space-y-6 text-gray-100">
        <div className="border-b border-gray-800 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Partner App & AI Marketplace
          </h1>
          <p className="text-sm text-gray-400">
            Browse and install extensions, custom AI prompts, and automations for your client accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
              Extension
            </span>
            <h3 className="font-semibold text-lg text-white">Salesforce CRM Connector Pro</h3>
            <p className="text-sm text-gray-400">
              Sync client leads, pipeline deals, and contacts directly into GBS CRM.
            </p>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Install for Clients
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-900/50 text-purple-300">
              AI Agent
            </span>
            <h3 className="font-semibold text-lg text-white">Google Business Auto-Responder Agent</h3>
            <p className="text-sm text-gray-400">
              Automated AI review management and local SEO optimization agent.
            </p>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Enable AI Agent
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
