"use client";

import React, { useState } from "react";

export default function PartnerCallCenterPage() {
  const [dialNumber, setDialNumber] = useState("");
  const [callActive, setCallActive] = useState(false);

  const [calls] = useState([
    { id: "c1", type: "INCOMING", caller: "+1 (555) 234-5678", duration: "3m 45s", status: "COMPLETED", summary: "Customer asked about enterprise software features." },
    { id: "c2", type: "OUTGOING", caller: "+1 (555) 876-5432", duration: "1m 20s", status: "COMPLETED", summary: "Followed up regarding callback request." },
    { id: "c3", type: "INCOMING", caller: "+1 (555) 999-0000", duration: "0s", status: "MISSED", summary: "Missed call. Automated SMS sent." },
  ]);

  return (
    <>
      <div style={{ padding: "24px", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Enterprise Call Center & Softphone</h1>
        <p style={{ color: "#A0A0A0", marginBottom: "24px" }}>
          In-browser WebRTC softphone, real-time call queue monitoring, IVR, and AI transcription.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px" }}>
          {/* Softphone Dialer */}
          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#D4AF37", textAlign: "center" }}>Softphone Dialer</h3>
            <input
              type="text"
              placeholder="+1 (555) 000-0000"
              value={dialNumber}
              onChange={(e) => setDialNumber(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "6px", background: "#111", border: "1px solid #444", color: "#FFF", fontSize: "16px", textAlign: "center", marginBottom: "20px" }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "20px" }}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(num => (
                <button
                  key={num}
                  onClick={() => setDialNumber(prev => prev + num)}
                  style={{ padding: "14px", borderRadius: "6px", background: "#222", border: "1px solid #333", color: "#FFF", fontSize: "18px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCallActive(!callActive)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "6px",
                background: callActive ? "#E74C3C" : "#2ECC71",
                color: "#FFF",
                fontWeight: "bold",
                fontSize: "16px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {callActive ? "End Call" : "Start Call"}
            </button>
          </div>

          {/* Call Logs & AI Summary */}
          <div>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#FFF" }}>Recent Call Logs & AI Transcripts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {calls.map(c => (
                <div key={c.id} style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "bold", color: "#FFF", fontSize: "15px" }}>{c.type}: {c.caller}</span>
                    <span style={{ fontSize: "12px", color: "#AAA" }}>{c.duration}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#CCC", marginBottom: "8px" }}>{c.summary}</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button style={{ padding: "4px 8px", borderRadius: "4px", background: "#333", border: "1px solid #555", color: "#D4AF37", fontSize: "11px", cursor: "pointer" }}>Listen Recording</button>
                    <button style={{ padding: "4px 8px", borderRadius: "4px", background: "#333", border: "1px solid #555", color: "#4285F4", fontSize: "11px", cursor: "pointer" }}>Full AI Transcript</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
