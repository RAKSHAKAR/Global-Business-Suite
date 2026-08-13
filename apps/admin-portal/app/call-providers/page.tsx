"use client";

import React from "react";

export default function CallProvidersPage() {
  return (
    <>
      <div style={{ padding: "24px", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Call Center & Telephony Providers</h1>
        <p style={{ color: "#A0A0A0", marginBottom: "24px" }}>
          Configure enterprise WebRTC calling, Twilio SIP Trunking, IVR menus, call queues, recording, and AI transcription.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "18px", color: "#D4AF37", marginBottom: "12px" }}>WebRTC Browser Calling Gateway</h3>
            <p style={{ fontSize: "14px", color: "#BBB", marginBottom: "16px" }}>
              Enables agents to make and receive calls directly in Chrome, Firefox, Edge, and Safari without softphone plugins.
            </p>
            <div style={{ background: "#111", padding: "12px", borderRadius: "6px", fontSize: "13px", color: "#888" }}>
              Status: <span style={{ color: "#2ECC71", fontWeight: "bold" }}>Operational (STUN/TURN Active)</span>
            </div>
          </div>

          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "18px", color: "#D4AF37", marginBottom: "12px" }}>Interactive Voice Response (IVR) Builder</h3>
            <p style={{ fontSize: "14px", color: "#BBB", marginBottom: "16px" }}>
              Define automated voice greetings, press-1 routing, office hours routing, and voicemail fallback rules.
            </p>
            <div style={{ background: "#111", padding: "12px", borderRadius: "6px", fontSize: "13px", color: "#888" }}>
              Active Rules: <span style={{ color: "#FFF", fontWeight: "bold" }}>4 Multi-level IVR Menus</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
