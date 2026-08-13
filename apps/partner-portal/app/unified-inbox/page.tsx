"use client";

import React, { useState } from "react";

export default function UnifiedInboxPage() {
  const [channels] = useState(["ALL", "GBP", "REVIEWS", "FACEBOOK", "INSTAGRAM", "WHATSAPP", "EMAIL", "SMS", "LIVE_CHAT", "TELEGRAM", "TEAMS"]);
  const [selectedChannel, setSelectedChannel] = useState("ALL");
  const [search, setSearch] = useState("");

  const [conversations] = useState([
    { id: "1", customer: "John Doe", channel: "WHATSAPP", subject: "Enterprise Pricing Inquiry", status: "OPEN", priority: "HIGH", time: "10 mins ago", snippet: "Hi, I would like to inquire about bulk seat licensing." },
    { id: "2", customer: "Alice Smith", channel: "GBP", subject: "Google Business Review", status: "UNREAD", priority: "URGENT", time: "25 mins ago", snippet: "Awesome service! Left 5 stars on Google Maps." },
    { id: "3", customer: "Robert Brown", channel: "EMAIL", subject: "Support Request #1042", status: "IN_PROGRESS", priority: "MEDIUM", time: "1 hour ago", snippet: "Could you help us configure custom DNS domain routing?" },
    { id: "4", customer: "Sarah Jenkins", channel: "LIVE_CHAT", subject: "Live Website Chat", status: "OPEN", priority: "MEDIUM", time: "2 hours ago", snippet: "Can I schedule a Zoom video consultation for tomorrow?" },
  ]);

  const [activeConv, setActiveConv] = useState(conversations[0]);
  const [messages, setMessages] = useState([
    { id: "m1", sender: "John Doe", type: "CUSTOMER", text: "Hi, I would like to inquire about bulk seat licensing for 50 users.", time: "10:15 AM" },
    { id: "m2", sender: "AI Assistant", type: "BOT", text: "[AI Suggested Reply]: Hello John! Our Enterprise Tier starts at $29/seat with full white-label and priority support. Would you like me to connect you with an account executive?", time: "10:16 AM" },
  ]);
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: "Partner Support",
      type: "AGENT",
      text: inputText,
      time: "Just now",
    }]);
    setInputText("");
  };

  return (
    <>
      <div style={{ display: "flex", height: "calc(100vh - 80px)", background: "#121212", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        
        {/* Left Sidebar: Conversations List */}
        <div style={{ width: "360px", borderRight: "1px solid #2A2A2A", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #2A2A2A" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", color: "#FFF" }}>Unified Inbox</h2>
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", background: "#1E1E1E", border: "1px solid #333", color: "#FFF", fontSize: "13px" }}
            />
            
            {/* Channel Filters */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginTop: "12px", paddingBottom: "4px" }}>
              {channels.map(ch => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "none",
                    background: selectedChannel === ch ? "#D4AF37" : "#222",
                    color: selectedChannel === ch ? "#000" : "#AAA",
                    fontSize: "11px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {conversations.map(c => (
              <div
                key={c.id}
                onClick={() => setActiveConv(c)}
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #1E1E1E",
                  background: activeConv.id === c.id ? "#222" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "600", fontSize: "14px", color: "#FFF" }}>{c.customer}</span>
                  <span style={{ fontSize: "11px", color: "#777" }}>{c.time}</span>
                </div>
                <div style={{ fontSize: "13px", color: "#D4AF37", marginBottom: "4px" }}>[{c.channel}] {c.subject}</div>
                <div style={{ fontSize: "12px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.snippet}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Main Pane: Message Timeline & AI Assistant */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #2A2A2A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "#FFF" }}>{activeConv.customer}</h3>
              <p style={{ fontSize: "12px", color: "#AAA" }}>Channel: {activeConv.channel} | Status: {activeConv.status} | Priority: {activeConv.priority}</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ padding: "6px 12px", borderRadius: "6px", background: "#222", border: "1px solid #444", color: "#D4AF37", fontSize: "12px", cursor: "pointer" }}>Merge Conversation</button>
              <button style={{ padding: "6px 12px", borderRadius: "6px", background: "#222", border: "1px solid #444", color: "#FFF", fontSize: "12px", cursor: "pointer" }}>Internal Note</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.map(m => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.type === "CUSTOMER" ? "flex-start" : "flex-end",
                  maxWidth: "70%",
                  background: m.type === "CUSTOMER" ? "#1E1E1E" : m.type === "BOT" ? "#1A2536" : "#2E3D29",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  padding: "12px 16px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "bold", color: m.type === "BOT" ? "#4285F4" : "#D4AF37", marginBottom: "4px" }}>
                  {m.sender} • {m.time}
                </div>
                <div style={{ fontSize: "14px", color: "#FFF", lineHeight: "1.4" }}>{m.text}</div>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <div style={{ padding: "16px 24px", borderTop: "1px solid #2A2A2A", display: "flex", gap: "12px" }}>
            <input
              type="text"
              placeholder="Type your message or AI suggested reply..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              style={{ flex: 1, padding: "12px", borderRadius: "6px", background: "#1E1E1E", border: "1px solid #333", color: "#FFF", fontSize: "14px" }}
            />
            <button
              onClick={handleSend}
              style={{ padding: "12px 24px", borderRadius: "6px", background: "#D4AF37", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer" }}
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
