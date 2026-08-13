"use client";

import React from "react";

export default function BookingProvidersPage() {
  return (
    <>
      <div style={{ padding: "24px", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Booking & Video Integrations</h1>
        <p style={{ color: "#A0A0A0", marginBottom: "24px" }}>
          Manage global calendar synchronizations (Google Calendar, Outlook) and video meeting integrations (Zoom, Teams).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#4285F4", marginBottom: "8px" }}>Google Calendar API</h3>
            <p style={{ fontSize: "13px", color: "#AAA" }}>Two-way real-time appointment availability sync.</p>
          </div>
          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#0078D4", marginBottom: "8px" }}>Microsoft Outlook Calendar</h3>
            <p style={{ fontSize: "13px", color: "#AAA" }}>Office 365 calendar event synchronization.</p>
          </div>
          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#2D8CFF", marginBottom: "8px" }}>Zoom Video Meetings</h3>
            <p style={{ fontSize: "13px", color: "#AAA" }}>Automated meeting link generation for video consultations.</p>
          </div>
          <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", color: "#6264A7", marginBottom: "8px" }}>Microsoft Teams Meetings</h3>
            <p style={{ fontSize: "13px", color: "#AAA" }}>Enterprise video consultation room links.</p>
          </div>
        </div>
      </div>
    </>
  );
}
