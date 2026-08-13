"use client";

import React, { useState } from "react";

export default function AiMarketplacePage() {
  const [filter, setFilter] = useState("all");

  const items = [
    {
      id: "gbp-responder",
      title: "Google Business Review Auto-Responder Agent",
      type: "Agent",
      category: "GBP",
      rating: 5.0,
      downloads: 1280,
      description: "Autonomous AI agent that responds to 5-star and negative Google Business reviews with policy compliance.",
    },
    {
      id: "saas-cfo-prompt",
      title: "SaaS CFO Financial Forecasting Prompt Pack",
      type: "Prompt Pack",
      category: "Finance",
      rating: 4.9,
      downloads: 850,
      description: "Advanced financial prompts modeling CAC, LTV, MRR retention, and runway projection.",
    },
    {
      id: "seo-keyword-workflow",
      title: "Local Rank & Citation AI Workflow Template",
      type: "Workflow",
      category: "SEO",
      rating: 4.88,
      downloads: 2100,
      description: "Complete autonomous workflow auditing local NAP citations and Google Map pack positions.",
    },
  ];

  return (
    <>
      <div className="p-6 space-y-6 text-gray-100">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              AI Marketplace & Prompt Hub
            </h1>
            <p className="text-sm text-gray-400">
              Discover and deploy pre-engineered AI prompt packs, autonomous agents, workflow templates, and knowledge packs.
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            + Publish AI Agent / Prompt
          </button>
        </div>

        <div className="flex gap-4 border-b border-gray-800 text-sm">
          {["all", "agents", "prompts", "workflows", "knowledge"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`pb-2 capitalize border-b-2 font-medium ${
                filter === cat
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-900/50 text-purple-300">
                    {item.type}
                  </span>
                  <span className="text-xs text-gray-400">{item.category}</span>
                </div>
                <h3 className="font-semibold text-lg text-white mt-2">{item.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{item.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-800/60 flex justify-between items-center">
                <div className="text-xs text-gray-400">★ {item.rating} ({item.downloads} downloads)</div>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                  Deploy to Portal
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
