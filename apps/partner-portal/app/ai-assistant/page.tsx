"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

const AGENT_CATALOG = [
  { key: "MARKETING_AGENT", name: "Marketing Agent", icon: "📣", desc: "Campaigns, copy, brand messaging" },
  { key: "SEO_AGENT", name: "SEO Agent", icon: "🔍", desc: "Keywords, meta tags, content optimization" },
  { key: "CRM_AGENT", name: "CRM Agent", icon: "👥", desc: "Lead scoring, outreach, pipeline guidance" },
  { key: "SALES_AGENT", name: "Sales Agent", icon: "💰", desc: "Proposals, objections, closing scripts" },
  { key: "SUPPORT_AGENT", name: "Support Agent", icon: "🎧", desc: "Customer FAQ, ticket resolution" },
  { key: "GBP_AGENT", name: "Google Business Agent", icon: "📍", desc: "GBP posts, review replies, Q&A" },
  { key: "SOCIAL_AGENT", name: "Social Media Agent", icon: "📱", desc: "Captions, hashtags, platform content" },
  { key: "ANALYTICS_AGENT", name: "Analytics Agent", icon: "📊", desc: "Insights, trend analysis, reports" },
  { key: "REVIEW_AGENT", name: "Review Agent", icon: "⭐", desc: "Review responses, reputation management" },
  { key: "KNOWLEDGE_AGENT", name: "Knowledge Agent", icon: "🧠", desc: "Document Q&A, knowledge base search" },
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentKey?: string;
  citations?: string[];
  timestamp: Date;
};

export default function AiAssistantPage() {
  const { token } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState("MARKETING_AGENT");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
  const [selectedKb, setSelectedKb] = useState<string>("");
  const [useRag, setUseRag] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentAgent = AGENT_CATALOG.find((a) => a.key === selectedAgent)!;

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/ai-knowledge/bases`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setKnowledgeBases(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !token) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const userInput = input;
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/v1/ai-agents/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentKey: selectedAgent,
          userPrompt: userInput,
          useRag,
          knowledgeBaseId: selectedKb || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content || data.message || "Agent completed task.",
          agentKey: selectedAgent,
          citations: data.citations || [],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error("Agent execution failed");
      }
    } catch (err) {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "⚠️ The agent encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#D4AF37", marginBottom: "4px" }}>
          🤖 AI Multi-Agent Assistant
        </h1>
        <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
          Select a specialized enterprise AI agent and chat with multi-step task execution and RAG knowledge retrieval.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", height: "700px" }}>
        {/* Left Panel: Agent Selector */}
        <div style={{ background: "#1A1A2E", borderRadius: "16px", padding: "16px", border: "1px solid #2D2D44", overflowY: "auto" }}>
          <h3 style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
            Select Agent
          </h3>
          {AGENT_CATALOG.map((agent) => (
            <button
              key={agent.key}
              id={`agent-btn-${agent.key}`}
              onClick={() => { setSelectedAgent(agent.key); setMessages([]); }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: selectedAgent === agent.key ? "linear-gradient(135deg, #D4AF37, #B8860B)" : "transparent",
                cursor: "pointer",
                marginBottom: "6px",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: "18px", marginBottom: "2px" }}>{agent.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: selectedAgent === agent.key ? "#000" : "#E5E7EB" }}>{agent.name}</div>
              <div style={{ fontSize: "11px", color: selectedAgent === agent.key ? "#333" : "#6B7280" }}>{agent.desc}</div>
            </button>
          ))}

          {/* RAG Settings */}
          <div style={{ marginTop: "16px", padding: "12px", background: "#0F0F23", borderRadius: "10px", border: "1px solid #2D2D44" }}>
            <h4 style={{ fontSize: "12px", fontWeight: 600, color: "#D4AF37", marginBottom: "8px" }}>🧠 Knowledge Base (RAG)</h4>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
              <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Enable Knowledge Retrieval</span>
            </label>
            {useRag && (
              <select
                id="kb-selector"
                value={selectedKb}
                onChange={(e) => setSelectedKb(e.target.value)}
                style={{ width: "100%", background: "#1A1A2E", color: "#E5E7EB", border: "1px solid #2D2D44", borderRadius: "6px", padding: "6px", fontSize: "12px" }}
              >
                <option value="">All Knowledge Bases</option>
                {knowledgeBases.map((kb: any) => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Right Panel: Chat Interface */}
        <div style={{ background: "#1A1A2E", borderRadius: "16px", border: "1px solid #2D2D44", display: "flex", flexDirection: "column" }}>
          {/* Chat Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #2D2D44", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "28px" }}>{currentAgent.icon}</span>
            <div>
              <div style={{ fontWeight: 600, color: "#E5E7EB" }}>{currentAgent.name}</div>
              <div style={{ fontSize: "12px", color: "#6B7280" }}>{currentAgent.desc}</div>
            </div>
            <button
              id="clear-chat-btn"
              onClick={() => setMessages([])}
              style={{ marginLeft: "auto", background: "#2D2D44", border: "none", color: "#9CA3AF", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
            >
              Clear Chat
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#4B5563", padding: "60px 20px" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>{currentAgent.icon}</div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#6B7280" }}>Start a conversation with {currentAgent.name}</div>
                <div style={{ fontSize: "13px", color: "#4B5563", marginTop: "8px" }}>{currentAgent.desc}</div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "75%",
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #D4AF37, #B8860B)" : "#0F0F23",
                  color: msg.role === "user" ? "#000" : "#E5E7EB",
                  border: msg.role === "assistant" ? "1px solid #2D2D44" : "none",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #2D2D44", fontSize: "11px", color: "#6B7280" }}>
                      📚 Sources: {msg.citations.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "12px 16px", background: "#0F0F23", border: "1px solid #2D2D44", borderRadius: "16px 16px 16px 4px", color: "#D4AF37", fontSize: "14px" }}>
                  {currentAgent.icon} Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #2D2D44", display: "flex", gap: "12px" }}>
            <textarea
              id="agent-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${currentAgent.name} anything... (Enter to send)`}
              rows={2}
              style={{ flex: 1, background: "#0F0F23", border: "1px solid #2D2D44", borderRadius: "10px", padding: "10px 14px", color: "#E5E7EB", fontSize: "14px", resize: "none", outline: "none" }}
            />
            <button
              id="send-agent-btn"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? "#2D2D44" : "linear-gradient(135deg, #D4AF37, #B8860B)",
                border: "none",
                borderRadius: "10px",
                padding: "10px 20px",
                color: loading || !input.trim() ? "#6B7280" : "#000",
                fontWeight: 600,
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "14px",
                alignSelf: "flex-end",
              }}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
