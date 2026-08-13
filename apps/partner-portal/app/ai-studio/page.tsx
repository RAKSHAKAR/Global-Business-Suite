"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

const CONTENT_TYPES = [
  { id: "BRANDED_POSTER", label: "Branded Social Poster", icon: "🎨", desc: "AI Visual Poster with custom Brand Logo watermark & SEO tags", platform: "Design" },
  { id: "SOCIAL_CAPTION", label: "Social Caption", icon: "📸", desc: "Instagram / Facebook / TikTok caption with hashtags", platform: "Social" },
  { id: "GOOGLE_POST", label: "Google Business Post", icon: "📍", desc: "Google My Business update post", platform: "GBP" },
  { id: "REVIEW_REPLY", label: "Review Reply", icon: "⭐", desc: "Professional response to customer reviews", platform: "Reviews" },
  { id: "BLOG_OUTLINE", label: "Blog Article", icon: "📝", desc: "Full blog post with headings and SEO", platform: "Blog" },
  { id: "EMAIL", label: "Email Campaign", icon: "📧", desc: "Marketing email with subject & CTA", platform: "Email" },
  { id: "SMS", label: "SMS / WhatsApp", icon: "💬", desc: "Short promotional text message", platform: "SMS" },
  { id: "AD_COPY", label: "Ad Copy", icon: "🎯", desc: "Google / Meta paid ad copy variants", platform: "Ads" },
  { id: "LANDING_PAGE", label: "Landing Page", icon: "🌐", desc: "Conversion-focused landing page copy", platform: "Web" },
  { id: "PRODUCT_DESCRIPTION", label: "Product Description", icon: "🛍️", desc: "E-commerce product listing copy", platform: "Shop" },
  { id: "SEO_META", label: "SEO Meta Tags", icon: "🔍", desc: "Title, description, and keyword optimization", platform: "SEO" },
  { id: "PRESS_RELEASE", label: "Press Release", icon: "📰", desc: "Professional news announcement", platform: "PR" },
  { id: "VIDEO_SCRIPT", label: "Video Script", icon: "🎬", desc: "YouTube / Reel video content script", platform: "Video" },
];

const TONE_OPTIONS = ["Professional", "Friendly", "Enthusiastic", "Formal", "Humorous", "Empathetic", "Persuasive", "Concise"];
const LENGTH_OPTIONS = ["Short (50-100 words)", "Medium (150-250 words)", "Long (350-500 words)", "Extended (600+ words)"];

type Generation = {
  id: string;
  contentType: string;
  prompt: string;
  result: string;
  modelUsed: string;
  tokensUsed?: number;
  estimatedCost?: number;
  createdAt: string;
};

export default function AiStudioPage() {
  const { token } = useAuth();
  const [activeType, setActiveType] = useState("SOCIAL_CAPTION");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("Professional");
  const [length, setLength] = useState("Medium (150-250 words)");
  const [targetAudience, setTargetAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<any[]>([]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Generation[]>([]);
  const [activeView, setActiveView] = useState<"studio" | "history">("studio");
  const [stats, setStats] = useState({ totalGenerations: 0, totalTokens: 0, totalCost: 0 });
  const [copied, setCopied] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [activeVariant, setActiveVariant] = useState(0);

  const currentType = CONTENT_TYPES.find((t) => t.id === activeType)!;

  useEffect(() => {
    if (!token) return;
    // Load available models
    fetch(`${API}/api/v1/ai-platform/models`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const modelList = Array.isArray(data) ? data : [];
        setModels(modelList);
        if (modelList.length > 0) setSelectedModel(modelList[0].modelKey);
      })
      .catch(() => {});
  }, [token]);

  const buildSystemInstruction = () => {
    return `You are an expert ${currentType.label} copywriter for a digital marketing platform.
Tone: ${tone}
Length: ${length}
${targetAudience ? `Target Audience: ${targetAudience}` : ""}
${keywords ? `Key SEO Terms: ${keywords}` : ""}
Generate compelling, high-quality ${currentType.label} content.`;
  };

  const handleGenerate = async (generateVariants = false) => {
    if (!prompt.trim() || !token) return;
    setLoading(true);
    setResult("");
    setVariants([]);

    try {
      const generationRequests = generateVariants ? [1, 2, 3] : [1];
      const results: string[] = [];

      if (activeType === "BRANDED_POSTER") {
        const res = await fetch(`${API}/api/v1/social/ai/poster`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic: prompt,
            platform: "INSTAGRAM",
            style: "GOLD_ELEGANCE",
            includeBrandLogo: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const contentOutput = `✨ BRANDED AI POSTER & SEO METADATA GENERATED\n\n📌 SEO Title: ${data.seo?.seoTitle}\n🏷️ Image Alt Text: ${data.seo?.imageAltText}\n📝 SEO Description: ${data.seo?.seoDescription}\n\n# HASHTAGS:\n${data.seo?.hashtags?.join(" ")}\n\n🖼️ POSTER SVG ASSET (DATA URI):\n${data.poster?.dataUri?.substring(0, 100)}... [Full High-Res SVG Asset Included]`;
          setResult(contentOutput);
          results.push(contentOutput);
        }
      } else {
        for (let i = 0; i < generationRequests.length; i++) {
          const variantNote = generateVariants ? ` (Variant ${i + 1} – provide a distinctly different approach)` : "";
          const res = await fetch(`${API}/api/v1/ai-platform/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              prompt: prompt + variantNote,
              systemInstruction: buildSystemInstruction(),
              modelKey: selectedModel || undefined,
              contentType: activeType,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            results.push(data.content || "");
            if (i === 0) {
              setResult(data.content || "");
              setStats((prev) => ({
                totalGenerations: prev.totalGenerations + 1,
                totalTokens: prev.totalTokens + (data.totalTokens || 0),
                totalCost: prev.totalCost + (data.estimatedCost || 0),
              }));
            }
          }
        }
      }

      if (generateVariants && results.length > 1) {
        setVariants(results);
        setResult(results[0]);
        setActiveVariant(0);
      }

      // Add to history
      const newGen: Generation = {
        id: crypto.randomUUID(),
        contentType: activeType,
        prompt,
        result: results[0] || "",
        modelUsed: selectedModel || "AI Model",
        createdAt: new Date().toISOString(),
      };
      setHistory((prev) => [newGen, ...prev].slice(0, 20));
    } catch (err) {
      setResult("⚠️ Generation failed. Please check your AI provider configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#D4AF37", marginBottom: "4px" }}>✨ AI Content Studio</h1>
          <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
            Generate professional content for every channel — powered by multi-model AI.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {["studio", "history"].map((view) => (
            <button
              key={view}
              id={`view-${view}-btn`}
              onClick={() => setActiveView(view as "studio" | "history")}
              style={{
                background: activeView === view ? "linear-gradient(135deg, #D4AF37, #B8860B)" : "#1A1A2E",
                border: "1px solid " + (activeView === view ? "transparent" : "#2D2D44"),
                color: activeView === view ? "#000" : "#9CA3AF",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "13px",
                textTransform: "capitalize",
              }}
            >
              {view === "studio" ? "🎨 Studio" : `📋 History (${history.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Usage Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Generations (Session)", value: stats.totalGenerations, icon: "✨" },
          { label: "Total Tokens Used", value: stats.totalTokens.toLocaleString(), icon: "🔢" },
          { label: "Estimated Cost", value: `$${stats.totalCost.toFixed(4)}`, icon: "💰" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "#1A1A2E", border: "1px solid #2D2D44", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>{stat.icon}</span>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#D4AF37" }}>{stat.value}</div>
              <div style={{ fontSize: "11px", color: "#6B7280" }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {activeView === "studio" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Left: Configuration */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Content Type Selector */}
            <div style={{ background: "#1A1A2E", border: "1px solid #2D2D44", borderRadius: "16px", padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Content Type</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    id={`type-${type.id}`}
                    onClick={() => setActiveType(type.id)}
                    style={{
                      padding: "10px 6px",
                      borderRadius: "10px",
                      border: activeType === type.id ? "2px solid #D4AF37" : "1px solid #2D2D44",
                      background: activeType === type.id ? "#D4AF3720" : "transparent",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "20px" }}>{type.icon}</div>
                    <div style={{ fontSize: "10px", fontWeight: 600, color: activeType === type.id ? "#D4AF37" : "#9CA3AF", marginTop: "4px", lineHeight: 1.2 }}>{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div style={{ background: "#1A1A2E", border: "1px solid #2D2D44", borderRadius: "16px", padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>Settings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Tone */}
                <div>
                  <label style={{ fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>Tone of Voice</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {TONE_OPTIONS.map((t) => (
                      <button key={t} id={`tone-${t}`} onClick={() => setTone(t)}
                        style={{ padding: "4px 10px", borderRadius: "20px", border: "1px solid " + (tone === t ? "#D4AF37" : "#2D2D44"), background: tone === t ? "#D4AF37" : "transparent", color: tone === t ? "#000" : "#9CA3AF", fontSize: "11px", cursor: "pointer", fontWeight: tone === t ? 600 : 400 }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length */}
                <div>
                  <label style={{ fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>Content Length</label>
                  <select id="length-select" value={length} onChange={(e) => setLength(e.target.value)}
                    style={{ width: "100%", background: "#0F0F23", border: "1px solid #2D2D44", borderRadius: "8px", padding: "8px", color: "#E5E7EB", fontSize: "13px" }}>
                    {LENGTH_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Target Audience */}
                <div>
                  <label style={{ fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>Target Audience (optional)</label>
                  <input id="audience-input" type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. small business owners, millennials"
                    style={{ width: "100%", background: "#0F0F23", border: "1px solid #2D2D44", borderRadius: "8px", padding: "8px 12px", color: "#E5E7EB", fontSize: "13px", boxSizing: "border-box" }} />
                </div>

                {/* Keywords */}
                <div>
                  <label style={{ fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>Keywords / Focus Terms (optional)</label>
                  <input id="keywords-input" type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. local SEO, best restaurant, fast delivery"
                    style={{ width: "100%", background: "#0F0F23", border: "1px solid #2D2D44", borderRadius: "8px", padding: "8px 12px", color: "#E5E7EB", fontSize: "13px", boxSizing: "border-box" }} />
                </div>

                {/* AI Model */}
                {models.length > 0 && (
                  <div>
                    <label style={{ fontSize: "12px", color: "#9CA3AF", display: "block", marginBottom: "6px" }}>AI Model</label>
                    <select id="model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                      style={{ width: "100%", background: "#0F0F23", border: "1px solid #2D2D44", borderRadius: "8px", padding: "8px", color: "#E5E7EB", fontSize: "13px" }}>
                      {models.map((m: any) => <option key={m.modelKey} value={m.modelKey}>{m.name} ({m.provider?.name})</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Input */}
            <div style={{ background: "#1A1A2E", border: "1px solid #2D2D44", borderRadius: "16px", padding: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#9CA3AF", display: "block", marginBottom: "8px" }}>
                {currentType.icon} {currentType.label} Brief
              </label>
              <textarea
                id="content-prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Describe what you need for your ${currentType.label}...\n\nExample: Generate a ${currentType.label.toLowerCase()} for a local pizza restaurant's grand opening event on Saturday.`}
                rows={5}
                style={{ width: "100%", background: "#0F0F23", border: "1px solid #2D2D44", borderRadius: "10px", padding: "12px", color: "#E5E7EB", fontSize: "14px", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  id="generate-btn"
                  onClick={() => handleGenerate(false)}
                  disabled={loading || !prompt.trim()}
                  style={{
                    flex: 1,
                    background: loading || !prompt.trim() ? "#2D2D44" : "linear-gradient(135deg, #D4AF37, #B8860B)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px",
                    color: loading || !prompt.trim() ? "#6B7280" : "#000",
                    fontWeight: 700,
                    cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                    fontSize: "14px",
                  }}
                >
                  {loading ? "⏳ Generating..." : "✨ Generate"}
                </button>
                <button
                  id="generate-variants-btn"
                  onClick={() => handleGenerate(true)}
                  disabled={loading || !prompt.trim()}
                  style={{
                    background: loading || !prompt.trim() ? "#2D2D44" : "#1A1A2E",
                    border: "1px solid " + (loading || !prompt.trim() ? "#2D2D44" : "#D4AF37"),
                    borderRadius: "10px",
                    padding: "12px 16px",
                    color: loading || !prompt.trim() ? "#6B7280" : "#D4AF37",
                    fontWeight: 600,
                    cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                    fontSize: "13px",
                  }}
                >
                  3× Variants
                </button>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {variants.length > 1 && (
              <div style={{ display: "flex", gap: "8px" }}>
                {variants.map((_, idx) => (
                  <button
                    key={idx}
                    id={`variant-${idx}-btn`}
                    onClick={() => { setActiveVariant(idx); setResult(variants[idx]); }}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "20px",
                      border: "1px solid " + (activeVariant === idx ? "#D4AF37" : "#2D2D44"),
                      background: activeVariant === idx ? "#D4AF37" : "transparent",
                      color: activeVariant === idx ? "#000" : "#9CA3AF",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    Variant {idx + 1}
                  </button>
                ))}
              </div>
            )}

            <div style={{ background: "#1A1A2E", border: "1px solid #2D2D44", borderRadius: "16px", flex: 1, display: "flex", flexDirection: "column", minHeight: "400px" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #2D2D44", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600, color: "#E5E7EB", fontSize: "14px" }}>
                  {currentType.icon} Generated {currentType.label}
                </div>
                {result && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      id="copy-result-btn"
                      onClick={handleCopy}
                      style={{ background: copied ? "#10B981" : "#2D2D44", border: "none", color: copied ? "#fff" : "#9CA3AF", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                      {copied ? "✓ Copied!" : "📋 Copy"}
                    </button>
                    <button
                      id="regenerate-btn"
                      onClick={() => handleGenerate(false)}
                      disabled={loading}
                      style={{ background: "#2D2D44", border: "none", color: "#D4AF37", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                      🔄 Regenerate
                    </button>
                  </div>
                )}
              </div>

              <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
                {!result && !loading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#4B5563", gap: "12px" }}>
                    <div style={{ fontSize: "48px" }}>{currentType.icon}</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#6B7280" }}>Your generated {currentType.label} will appear here</div>
                    <div style={{ fontSize: "13px", color: "#4B5563", textAlign: "center" }}>Configure your settings, enter a brief, and click Generate</div>
                  </div>
                )}
                {loading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px" }}>
                    <div style={{ fontSize: "48px", animation: "spin 1s linear infinite" }}>✨</div>
                    <div style={{ color: "#D4AF37", fontSize: "16px", fontWeight: 600 }}>Generating your {currentType.label}...</div>
                    <div style={{ color: "#6B7280", fontSize: "13px" }}>AI is crafting high-quality content</div>
                  </div>
                )}
                {result && !loading && (
                  <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#E5E7EB", fontSize: "14px", lineHeight: "1.8", fontFamily: "inherit", margin: 0 }}>
                    {result}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History View */
        <div style={{ background: "#1A1A2E", border: "1px solid #2D2D44", borderRadius: "16px" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #2D2D44" }}>
            <h3 style={{ color: "#E5E7EB", fontWeight: 600 }}>Generation History (Session)</h3>
          </div>
          <div style={{ padding: "16px" }}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", color: "#4B5563", padding: "40px" }}>No generations yet in this session.</div>
            ) : (
              history.map((gen) => (
                <div key={gen.id} style={{ padding: "16px", border: "1px solid #2D2D44", borderRadius: "12px", marginBottom: "12px", background: "#0F0F23" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ color: "#D4AF37", fontWeight: 600, fontSize: "13px" }}>
                      {CONTENT_TYPES.find((t) => t.id === gen.contentType)?.icon} {CONTENT_TYPES.find((t) => t.id === gen.contentType)?.label}
                    </span>
                    <span style={{ color: "#6B7280", fontSize: "11px" }}>{new Date(gen.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "8px" }}>📋 {gen.prompt}</div>
                  <div style={{ fontSize: "13px", color: "#E5E7EB", background: "#1A1A2E", padding: "10px", borderRadius: "8px", maxHeight: "120px", overflowY: "auto", whiteSpace: "pre-wrap" }}>
                    {gen.result}
                  </div>
                  <button
                    onClick={() => { setResult(gen.result); setActiveType(gen.contentType); setActiveView("studio"); }}
                    style={{ marginTop: "8px", background: "#2D2D44", border: "none", color: "#D4AF37", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>
                    Load in Studio →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
