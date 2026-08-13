"use client";

import React, { useState } from "react";

export default function PartnerWhiteLabelBrandingPage() {
  const [brandName, setBrandName] = useState("Acme Digital Solutions");
  const [primaryColor, setPrimaryColor] = useState("#2ECC71");
  const [customDomain, setCustomDomain] = useState("app.acmedigital.com");

  return (
    <>
      <div style={{ padding: "24px", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>Custom White-Label Branding</h1>
        <p style={{ color: "#A0A0A0", marginBottom: "24px" }}>
          Rebrand the entire platform for your clients with custom logo, brand name, color palette, custom domain, and PDF invoices.
        </p>

        <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "24px", maxWidth: "600px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Business / Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#111", border: "1px solid #444", color: "#FFF" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Custom CNAME Domain</label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#111", border: "1px solid #444", color: "#FFF" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Brand Primary Color</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: "100%", height: "40px", borderRadius: "6px", background: "#111", border: "1px solid #444", cursor: "pointer" }}
            />
          </div>

          <button style={{ padding: "12px 24px", borderRadius: "6px", background: "#D4AF37", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer", width: "100%" }}>
            Apply Branding
          </button>
        </div>
      </div>
    </>
  );
}
