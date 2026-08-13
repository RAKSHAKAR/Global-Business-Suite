"use client";

import React, { useState } from "react";

export default function DeveloperPortalPage() {
  const [activeTab, setActiveTab] = useState("apps");

  const sdks = [
    { lang: "TypeScript / JS", cmd: "npm install @gbs/sdk-js", version: "1.0.0" },
    { lang: "Python", cmd: "pip install gbs-sdk-python", version: "1.0.0" },
    { lang: "React Native / Expo", cmd: "npm install @gbs/sdk-react-native", version: "1.0.0" },
    { lang: "Flutter", cmd: "flutter pub add gbs_flutter_sdk", version: "1.0.0" },
    { lang: "Go", cmd: "go get github.com/gbs/sdk-go", version: "1.0.0" },
    { lang: "Java", cmd: "implementation 'com.gbs:gbs-sdk-java:1.0.0'", version: "1.0.0" },
    { lang: ".NET / C#", cmd: "dotnet add package Gbs.Sdk.DotNet", version: "1.0.0" },
    { lang: "PHP", cmd: "composer require gbs/sdk-php", version: "1.0.0" },
  ];

  return (
    <>
      <div className="p-6 space-y-6 text-gray-100">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Developer Portal & SDK Management
            </h1>
            <p className="text-sm text-gray-400">
              Manage OAuth applications, API keys, webhook subscriptions, sandbox testing, and public SDK distributions.
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            + Register OAuth App
          </button>
        </div>

        <div className="flex gap-4 border-b border-gray-800 text-sm">
          {["apps", "sdks", "webhooks", "sandbox", "explorer"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 capitalize border-b-2 font-medium ${
                activeTab === tab
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab === "sdks" ? "Official SDKs" : tab}
            </button>
          ))}
        </div>

        {activeTab === "apps" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white">Registered OAuth Applications</h3>
            <div className="border border-gray-800 rounded-lg p-4 bg-gray-950 flex justify-between items-center">
              <div>
                <div className="font-semibold text-white">Default Enterprise OAuth App</div>
                <div className="text-xs text-gray-400 font-mono mt-1">Client ID: gbs_app_8a39b2f1</div>
                <div className="text-xs text-gray-500 mt-1">Redirect: https://oauth.example.com/callback</div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 text-xs rounded bg-emerald-900/50 text-emerald-300 font-medium">
                  ACTIVE (Tier: Enterprise)
                </span>
                <div className="text-xs text-gray-400 mt-2">API Requests: 142,500 / mo</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sdks" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sdks.map((s) => (
              <div key={s.lang} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-white">{s.lang} SDK</span>
                  <span className="text-xs text-gray-400">v{s.version}</span>
                </div>
                <code className="block bg-gray-950 p-2 rounded text-xs text-emerald-400 font-mono">
                  {s.cmd}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
