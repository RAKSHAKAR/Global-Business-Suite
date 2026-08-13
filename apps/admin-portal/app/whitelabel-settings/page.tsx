"use client";

import React, { useState } from "react";

export default function WhiteLabelSettingsPage() {
  const [brandName, setBrandName] = useState("Global Business Suite");
  const [logoUrl, setLogoUrl] = useState("https://via.placeholder.com/150x50/D4AF37/FFFFFF?text=BRAND+LOGO");
  const [faviconUrl, setFaviconUrl] = useState("https://via.placeholder.com/32/D4AF37/FFFFFF?text=G");
  const [primaryColor, setPrimaryColor] = useState("#D4AF37");
  const [secondaryColor, setSecondaryColor] = useState("#1A1A1A");
  const [customDomain, setCustomDomain] = useState("portal.partnerdomain.com");

  return (
    <>
      <div style={{ padding: "24px", color: "#F5F5F5", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "8px" }}>White-Label Platform Governance</h1>
        <p style={{ color: "#A0A0A0", marginBottom: "24px" }}>
          Configure global white-label defaults, brand logos, favicons for AI posters, domain resolution rules, custom email/PDF templates, and branded AI settings.
        </p>

        <div style={{ background: "#1E1E1E", border: "1px solid #333", borderRadius: "8px", padding: "24px", maxWidth: "650px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#111", border: "1px solid #444", color: "#FFF" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Brand Logo Image URL (Used for AI Poster Watermarks)</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#111", border: "1px solid #444", color: "#FFF" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Brand Favicon URL</label>
            <input
              type="text"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#111", border: "1px solid #444", color: "#FFF" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Custom Domain</label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", background: "#111", border: "1px solid #444", color: "#FFF" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Primary Color</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "6px", background: "#111", border: "1px solid #444", cursor: "pointer" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>Secondary Color</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                style={{ width: "100%", height: "40px", borderRadius: "6px", background: "#111", border: "1px solid #444", cursor: "pointer" }}
              />
            </div>
          </div>

          <button style={{
            padding: "12px 24px",
            borderRadius: "6px",
            background: "#D4AF37",
            color: "#000",
            fontWeight: "bold",
            border: "none",
            cursor: "pointer",
            width: "100%",
          }}>
            Save White-Label Settings
          </button>
        </div>
      </div>
    </>
  );
}
