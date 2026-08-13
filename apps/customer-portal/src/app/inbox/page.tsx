"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function CustomerInboxPage() {
  const [messages, setMessages] = useState([
    { id: "1", sender: "Business Support", type: "AGENT", text: "Hello! Welcome to our customer support center. How can we help you today?", time: "10:00 AM" },
    { id: "2", sender: "You", type: "CUSTOMER", text: "Hi, I would like to check my upcoming appointment schedule.", time: "10:05 AM" },
  ]);
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), sender: "You", type: "CUSTOMER", text: inputText, time: "Just now" }
    ]);
    setInputText("");

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: "AI Inbox Assistant", type: "AGENT", text: "I have received your message. A representative will get back to you shortly or you can manage your bookings directly in the Appointments tab.", time: "Just now" }
      ]);
    }, 1000);
  };

  return (
    <DashboardLayout>
    <div style={{ padding: "24px", minHeight: "100%", background: "var(--gbs-bg-page)", color: "var(--gbs-text-primary)", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>Live Customer Chat & Messages</h1>
      <p style={{ color: "var(--gbs-text-secondary)", marginBottom: "20px" }}>Chat with our business team in real time across all integrated communication channels.</p>

      <div style={{ background: "var(--gbs-bg-surface)", border: "1px solid var(--gbs-border-color)", borderRadius: "12px", height: "min(500px, calc(100dvh - 180px))", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.type === "CUSTOMER" ? "flex-end" : "flex-start",
                maxWidth: "75%",
                background: m.type === "CUSTOMER" ? "#2563EB" : "#334155",
                borderRadius: "10px",
                padding: "12px 16px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "4px" }}>{m.sender} • {m.time}</div>
              <div style={{ fontSize: "14px", lineHeight: "1.4" }}>{m.text}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: "16px", borderTop: "1px solid var(--gbs-border-color)", display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={{ flex: 1, minWidth: 0, padding: "12px", borderRadius: "8px", background: "var(--gbs-bg-page)", border: "1px solid var(--gbs-border-hover)", color: "var(--gbs-text-primary)", fontSize: "14px" }}
          />
          <button
            onClick={handleSend}
            style={{ padding: "12px 20px", borderRadius: "8px", background: "#38BDF8", color: "#0F172A", fontWeight: "bold", border: "none", cursor: "pointer" }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
