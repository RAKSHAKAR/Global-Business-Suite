"use client";

import React, { useState } from "react";

export default function LowCodePage() {
  const [selectedBuilder, setSelectedBuilder] = useState("FORM");

  const builders = [
    { id: "FORM", label: "Visual Form Builder" },
    { id: "WORKFLOW", label: "Visual Workflow Builder" },
    { id: "PAGE", label: "Visual Page Builder" },
    { id: "DASHBOARD", label: "Visual Dashboard Builder" },
    { id: "BUSINESS_RULE", label: "Business Rule Builder" },
    { id: "DATA_MODEL", label: "Data Model Builder" },
  ];

  return (
    <>
      <div className="p-6 space-y-6 text-gray-100">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Low-Code / No-Code Visual Studio
            </h1>
            <p className="text-sm text-gray-400">
              Build custom enterprise forms, visual workflows, pages, business rules, and dynamic data models without writing code.
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
            + New Visual Component
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-800">
          {builders.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBuilder(b.id)}
              className={`px-4 py-2 text-sm rounded-lg font-medium whitespace-nowrap transition ${
                selectedBuilder === b.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 hover:bg-gray-800 text-gray-300"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 min-h-[400px] flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center text-2xl font-bold">
            ⚙
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">
              Visual Canvas for {builders.find((b) => b.id === selectedBuilder)?.label}
            </h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mt-1">
              Drag-and-drop components, configure validation rules, set triggers, and deploy directly to portals and mobile apps.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg font-medium">
              Launch Visual Canvas
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm px-4 py-2 rounded-lg font-medium">
              Import Template
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
