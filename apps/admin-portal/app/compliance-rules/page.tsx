"use client";

import React from "react";

export default function ComplianceRulesPage() {
  return (
    <>
      <div style={{ padding: "24px", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Enterprise Compliance & Retention Engine</h1>
        <p style={{ color: "#A0A0A0", marginBottom: "24px" }}>
          Define data retention policies by country/module, manage legal holds, and trigger compliance data exports.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "18px", color: "#D4AF37", marginBottom: "12px" }}>Module Retention Policies</h3>
            <ul style={{ listStyle: "none", padding: 0, fontSize: "14px", color: "#DDD" }}>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>Inbox Conversations: <strong>365 Days (Archive)</strong></li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>Call Recordings & Transcripts: <strong>180 Days (Purge)</strong></li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #222" }}>Appointment & Booking History: <strong>730 Days (Archive)</strong></li>
              <li style={{ padding: "8px 0" }}>System & Audit Action Logs: <strong>1825 Days (5 Years)</strong></li>
            </ul>
          </div>

          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "18px", color: "#D4AF37", marginBottom: "12px" }}>Compliance Export Generator</h3>
            <p style={{ fontSize: "14px", color: "#BBB", marginBottom: "16px" }}>
              Generate complete certified audit export bundles in PDF, Excel, CSV, or JSON format.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={{ padding: "10px 16px", borderRadius: "6px", background: "#D4AF37", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer" }}>
                Export PDF Bundle
              </button>
              <button style={{ padding: "10px 16px", borderRadius: "6px", background: "#333", color: "#FFF", border: "1px solid #555", fontWeight: "bold", cursor: "pointer" }}>
                Export JSON / CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
