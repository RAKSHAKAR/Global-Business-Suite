"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function CustomerCallRequestsPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <DashboardLayout>
    <div style={{ padding: "24px", minHeight: "100%", background: "var(--gbs-bg-page)", color: "var(--gbs-text-primary)", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>Request Instant Callback</h1>
      <p style={{ color: "var(--gbs-text-secondary)", marginBottom: "24px" }}>Schedule an immediate phone call with a dedicated business specialist.</p>

      <div style={{ background: "var(--gbs-bg-surface)", border: "1px solid var(--gbs-border-color)", borderRadius: "12px", padding: "24px", maxWidth: "500px" }}>
        {submitted ? (
          <div style={{ padding: "20px", background: "rgba(34, 197, 94, 0.1)", border: "1px solid #22C55E", borderRadius: "8px", color: "#4ADE80", textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "6px" }}>Callback Request Confirmed!</h3>
            <p style={{ fontSize: "14px" }}>An agent will call you at {phoneNumber} at your selected time.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Your Phone Number</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "var(--gbs-bg-page)", border: "1px solid var(--gbs-border-hover)", color: "var(--gbs-text-primary)" }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Preferred Time</label>
              <input
                type="datetime-local"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "var(--gbs-bg-page)", border: "1px solid var(--gbs-border-hover)", color: "var(--gbs-text-primary)" }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Topic / Notes</label>
              <textarea
                placeholder="Briefly describe what you'd like to discuss..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "var(--gbs-bg-page)", border: "1px solid var(--gbs-border-hover)", color: "var(--gbs-text-primary)" }}
              />
            </div>

            <button
              type="submit"
              style={{ width: "100%", padding: "12px", borderRadius: "6px", background: "#38BDF8", color: "#0F172A", fontWeight: "bold", border: "none", cursor: "pointer" }}
            >
              Submit Callback Request
            </button>
          </form>
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}
