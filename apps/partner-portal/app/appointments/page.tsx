"use client";

import React, { useState } from "react";

export default function PartnerAppointmentsPage() {
  const [bookings] = useState([
    { id: "b1", customer: "John Doe", service: "Enterprise Demo Consultation", time: "Tomorrow 10:00 AM - 10:45 AM", staff: "Alex Vance", type: "ZOOM", status: "SCHEDULED", link: "https://zoom.us/j/123456789" },
    { id: "b2", customer: "Sarah Smith", service: "Strategy Session", time: "Tomorrow 2:00 PM - 2:30 PM", staff: "Maria Garcia", type: "MS_TEAMS", status: "SCHEDULED", link: "https://teams.microsoft.com/l/meetup" },
    { id: "b3", customer: "David Lee", service: "Onboarding Support", time: "Friday 11:00 AM - 12:00 PM", staff: "Alex Vance", type: "IN_PERSON", status: "CONFIRMED", link: undefined },
  ]);

  return (
    <>
      <div style={{ padding: "24px", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Appointments & Booking Schedule</h1>
        <p style={{ color: "#A0A0A0", marginBottom: "24px" }}>
          Manage online bookings, staff availability, Google/Outlook calendar sync, Zoom/Teams video calls, and QR check-in.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {bookings.map(b => (
            <div key={b.id} style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFF" }}>{b.customer}</h3>
                <span style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "4px", background: "rgba(46, 204, 113, 0.2)", color: "#2ECC71" }}>{b.status}</span>
              </div>
              <p style={{ fontSize: "14px", color: "#D4AF37", marginBottom: "4px" }}>{b.service}</p>
              <p style={{ fontSize: "12px", color: "#AAA", marginBottom: "4px" }}>Time: {b.time}</p>
              <p style={{ fontSize: "12px", color: "#AAA", marginBottom: "12px" }}>Staff: {b.staff} | Type: {b.type}</p>

              {b.link && (
                <a href={b.link} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "8px 12px", borderRadius: "6px", background: "#4285F4", color: "#FFF", fontSize: "12px", textDecoration: "none", fontWeight: "bold" }}>
                  Join {b.type} Video Meeting
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
