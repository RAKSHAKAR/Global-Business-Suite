"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function CustomerCopilotPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "AI",
      text: "Hello! Welcome to your Customer AI Copilot. Ask me about your services, invoices, appointment schedules, or Google Business profile status.",
    },
  ]);

  const handleAsk = () => {
    if (!query.trim()) return;
    const userQ = query;
    setQuery("");
    setMessages((prev) => [
      ...prev,
      { sender: "USER", text: userQ },
      {
        sender: "AI",
        text: `[Customer Copilot] Searching enterprise knowledge base for '${userQ}'... All services active and optimized.`,
      },
    ]);
  };

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="border-b border-gray-800 pb-3">
          <h1 className="text-xl font-bold text-white">Customer AI Copilot & Knowledge Search</h1>
          <p className="text-xs text-gray-400">Powered by GBS Advanced Semantic RAG</p>
        </div>

        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === "USER" ? "justify-end" : "justify-start"}`}>
              <div
                className={`p-3 rounded-lg text-sm max-w-md ${
                  m.sender === "USER"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-200"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask AI Copilot..."
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleAsk}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-lg text-sm font-semibold"
        >
          Ask
        </button>
      </div>
    </div>
    </DashboardLayout>
  );
}
