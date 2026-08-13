"use client";

import React, { useState } from "react";

export default function EnterpriseCopilotPage() {
  const [role, setRole] = useState("ADMIN");
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "ASSISTANT",
      text: "Hello! I am your Unified Enterprise AI Copilot. How can I assist you today across Admin, CRM, Finance, Developer, or Social Media operations?",
    },
  ]);

  const roles = [
    "ADMIN",
    "PARTNER",
    "CUSTOMER",
    "DEVELOPER",
    "MARKETING",
    "CRM",
    "FINANCE",
    "ANALYTICS",
    "GOOGLE_BUSINESS",
    "SOCIAL_MEDIA",
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { sender: "USER", text: userMsg },
      {
        sender: "ASSISTANT",
        text: `[GBS Enterprise Copilot - ${role} Mode] Processing query: '${userMsg}'. All business systems operational with 99.99% SLA uptime.`,
      },
    ]);
  };

  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        setMessages((prev) => [
          ...prev,
          { sender: "USER", text: "🎙️ [Voice Input]: Show top high priority CRM leads and latest GBP review score" },
          {
            sender: "ASSISTANT",
            text: "🎙️ [Voice AI Reply]: Navigating to CRM deals. Current GBP rating is 4.9 across 182 reviews.",
          },
        ]);
      }, 2500);
    }
  };

  return (
    <>
      <div className="p-6 space-y-6 text-gray-100 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Enterprise AI Copilot & Voice AI
            </h1>
            <p className="text-sm text-gray-400">
              Unified cross-role autonomous assistant with speech-to-text, text-to-speech, and deep platform actions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Copilot Role Scoping:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="bg-gray-900 border border-gray-800 text-sm font-semibold text-white px-3 py-1.5 rounded-lg"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")} COPILOT
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.sender === "USER" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xl p-3.5 rounded-xl text-sm ${
                  m.sender === "USER"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-950 border border-gray-800 text-gray-200 rounded-bl-none"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleVoiceToggle}
            className={`px-4 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-2 ${
              isRecording
                ? "bg-red-600 animate-pulse text-white"
                : "bg-gray-800 hover:bg-gray-700 text-gray-200"
            }`}
          >
            🎙️ {isRecording ? "Listening..." : "Voice Command"}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Ask ${role.replace("_", " ")} Copilot anything...`}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-semibold text-sm transition"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
