"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function CustomerAppointmentsPage() {
  const [appointments] = useState([
    { id: "a1", service: "Enterprise Strategy Consultation", date: "Tomorrow, Aug 8", time: "10:00 AM", type: "ZOOM", status: "CONFIRMED", link: "https://zoom.us/j/987654321" },
    { id: "a2", service: "Product Onboarding Session", date: "Friday, Aug 10", time: "2:00 PM", type: "MS_TEAMS", status: "SCHEDULED", link: "https://teams.microsoft.com" },
  ]);

  return (
    <DashboardLayout>
    <div style={{ padding: "24px", minHeight: "100%", background: "var(--gbs-bg-page)", color: "var(--gbs-text-primary)", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px" }}>My Appointments & Bookings</h1>
          <p style={{ color: "var(--gbs-text-secondary)" }}>Self-service appointment scheduler, video consultation links, and QR check-in codes.</p>
        </div>
        <button style={{ padding: "10px 20px", borderRadius: "8px", background: "#38BDF8", color: "#0F172A", fontWeight: "bold", border: "none", cursor: "pointer" }}>
          + Book New Appointment
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {appointments.map(a => (
          <div key={a.id} style={{ background: "var(--gbs-bg-surface)", border: "1px solid var(--gbs-border-color)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", color: "#38BDF8", fontWeight: "bold" }}>{a.type}</span>
              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: "rgba(34, 197, 94, 0.2)", color: "#4ADE80", fontWeight: "bold" }}>{a.status}</span>
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "bold", color: "var(--gbs-text-primary)", marginBottom: "8px" }}>{a.service}</h3>
            <p style={{ fontSize: "14px", color: "var(--gbs-text-secondary)", marginBottom: "16px" }}>{a.date} at {a.time}</p>

            <div style={{ display: "flex", gap: "8px" }}>
              <a href={a.link} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "8px 14px", borderRadius: "6px", background: "#2563EB", color: "#FFF", fontSize: "13px", fontWeight: "bold", textDecoration: "none" }}>
                Join Video Meeting
              </a>
              <button style={{ padding: "8px 14px", borderRadius: "6px", background: "transparent", border: "1px solid var(--gbs-border-hover)", color: "var(--gbs-text-primary)", fontSize: "13px", cursor: "pointer" }}>
                Reschedule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </DashboardLayout>
  );
}
