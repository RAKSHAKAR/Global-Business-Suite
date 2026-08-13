"use client";

import React, { useState } from "react";

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState("all");

  const plugins = [
    {
      id: "salesforce-crm-connector",
      name: "Salesforce CRM Connector Pro",
      category: "Extension",
      description: "Deep 2-way real-time contact, deal, and lead synchronization with Salesforce Cloud.",
      version: "2.1.0",
      rating: 4.9,
      downloads: 1420,
      price: "$49 / mo",
      status: "Installed",
    },
    {
      id: "ai-prompt-suite",
      name: "AI Prompt Engineering Suite",
      category: "AI Prompt Pack",
      description: "500+ pre-engineered enterprise prompts for SEO, social marketing, and customer support.",
      version: "1.5.0",
      rating: 4.95,
      downloads: 3890,
      price: "Free",
      status: "Available",
    },
    {
      id: "iot-sensor-pack",
      name: "IoT Sensor Asset Tracking Pack",
      category: "Business App",
      description: "Real-time MQTT equipment monitoring, temperature logging, and asset alert dashboards.",
      version: "1.0.0",
      rating: 4.85,
      downloads: 650,
      price: "$99 / mo",
      status: "Available",
    },
  ];

  return (
    <>
      <div className="p-6 space-y-6 text-gray-100">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Plugin & Extension Marketplace
            </h1>
            <p className="text-sm text-gray-400">
              Install, manage, and configure enterprise plugins, business apps, and extensions with sandbox security.
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            + Publish Private Plugin
          </button>
        </div>

        <div className="flex gap-4 border-b border-gray-800 text-sm">
          {["all", "installed", "paid", "free", "private"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 capitalize border-b-2 font-medium ${
                activeTab === tab
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab} Plugins
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                    {plugin.category}
                  </span>
                  <span className="text-xs text-gray-400">v{plugin.version}</span>
                </div>
                <h3 className="font-semibold text-lg text-white mt-2">{plugin.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{plugin.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-800/60 flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-gray-200">{plugin.price}</span>
                  <div className="text-xs text-gray-400">★ {plugin.rating} ({plugin.downloads} installs)</div>
                </div>
                <button
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    plugin.status === "Installed"
                      ? "bg-gray-800 text-gray-300 cursor-default"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                >
                  {plugin.status}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
