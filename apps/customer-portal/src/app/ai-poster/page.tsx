"use client";

import DashboardLayout from "@/components/DashboardLayout";
import {
  SparklesIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  TagIcon,
  GlobeAltIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { useState } from "react";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

const PLATFORMS = [
  { id: "INSTAGRAM", name: "Instagram", icon: "📸", aspect: "1:1 Square (1080x1080)" },
  { id: "FACEBOOK", name: "Facebook", icon: "📘", aspect: "1.91:1 Feed (1200x630)" },
  { id: "LINKEDIN", name: "LinkedIn", icon: "💼", aspect: "1.91:1 Banner (1200x627)" },
  { id: "TWITTER_X", name: "Twitter / X", icon: "🐦", aspect: "16:9 Card (1200x675)" },
  { id: "PINTEREST", name: "Pinterest", icon: "📌", aspect: "2:3 Pin (1000x1500)" },
  { id: "GOOGLE_BUSINESS", name: "Google Business Profile", icon: "📍", aspect: "4:3 Photo (1024x768)" },
];

const STYLES = [
  { id: "GOLD_ELEGANCE", name: "Gold Elegance", bg: "from-amber-900 to-black" },
  { id: "NEON_TECH", name: "Neon Tech", bg: "from-cyan-900 to-purple-950" },
  { id: "CORPORATE_DARK", name: "Corporate Dark", bg: "from-slate-900 to-blue-950" },
  { id: "OCEAN_BLUE", name: "Ocean Blue", bg: "from-blue-900 to-teal-950" },
  { id: "SUNSET_GLOW", name: "Sunset Glow", bg: "from-rose-950 to-amber-950" },
];

const WATERMARK_POSITIONS = [
  { id: "TOP_RIGHT", name: "Top Right" },
  { id: "TOP_LEFT", name: "Top Left" },
  { id: "BOTTOM_RIGHT", name: "Bottom Right" },
  { id: "BOTTOM_LEFT", name: "Bottom Left" },
  { id: "CENTER_WATERMARK", name: "Center Overlay" },
];

export default function AIPosterGeneration() {
  const { token } = useAuth();
  const [topic, setTopic] = useState("");
  const [headline, setHeadline] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("INSTAGRAM");
  const [selectedStyle, setSelectedStyle] = useState("GOLD_ELEGANCE");
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState("TOP_RIGHT");
  const [includeLogo, setIncludeLogo] = useState(true);

  const [loading, setLoading] = useState(false);
  const [posterResult, setPosterResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"image" | "seo">("image");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a campaign topic or prompt.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (!token) throw new Error("Sign in before generating a poster.");
      const data = await apiRequest<any>("/api/v1/social/ai/poster", token, {
        method: "POST",
        body: JSON.stringify({
          topic,
          headline: headline || topic,
          platform: selectedPlatform,
          style: selectedStyle,
          customLogoUrl: customLogoUrl || undefined,
          watermarkPosition,
          includeBrandLogo: includeLogo,
        }),
      });

      setPosterResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate branded poster.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySeo = () => {
    if (!posterResult?.seo) return;
    const seoText = `TITLE: ${posterResult.seo.seoTitle}\n\nALT TEXT: ${posterResult.seo.imageAltText}\n\nDESCRIPTION: ${posterResult.seo.seoDescription}\n\nHASHTAGS: ${posterResult.seo.hashtags.join(" ")}`;
    navigator.clipboard.writeText(seoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] to-[#B8860B]">
              AI Social Media Poster & SEO Generator
            </h1>
          </div>
          <p className="text-gray-500">
            Generate platform-specific visual posters with your custom brand logo / favicon overlay, complete with SEO alt-text and social indexing tags.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Topic & Headline */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Campaign Topic / Offer *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none"
                    placeholder="e.g. 50% Off Summer Sale on Premium Accessories"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Poster Main Headline (Optional)
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent outline-none"
                    placeholder="e.g. Elevate Your Summer Style Today"
                  />
                </div>
              </div>

              {/* Social Platform Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Social Platform & Aspect Ratio *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`p-3 rounded-xl text-left border transition-all text-xs flex flex-col gap-1 ${
                        selectedPlatform === p.id
                          ? "border-[#D4AF37] bg-[#D4AF37]/10 text-gray-900 font-bold"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      <span className="text-base">{p.icon} {p.name}</span>
                      <span className="text-[10px] opacity-75">{p.aspect}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Design Style Theme */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Design Aesthetics & Style Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStyle(s.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                        selectedStyle === s.id
                          ? "border-[#D4AF37] bg-gray-900 text-white"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${s.bg}`} />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Logo & Watermark Overlay Configuration */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <GlobeAltIcon className="w-4 h-4 text-[#D4AF37]" /> Brand Logo / Favicon Overlay
                  </label>
                  <input
                    type="checkbox"
                    checked={includeLogo}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                  />
                </div>

                {includeLogo && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Custom Logo / Favicon URL (Leave blank to use account default)
                      </label>
                      <input
                        type="url"
                        value={customLogoUrl}
                        onChange={(e) => setCustomLogoUrl(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-2.5 text-xs outline-none"
                        placeholder="https://yourbrand.com/logo.png"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Watermark Position</label>
                      <select
                        value={watermarkPosition}
                        onChange={(e) => setWatermarkPosition(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-2.5 text-xs outline-none"
                      >
                        {WATERMARK_POSITIONS.map((pos) => (
                          <option key={pos.id} value={pos.id}>
                            {pos.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] hover:opacity-95 text-white py-3.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <SparklesIcon className="w-5 h-5" />
                )}
                {loading ? "Designing Branded Poster..." : "Generate Branded AI Poster"}
              </button>
            </div>
          </div>

          {/* Poster & SEO Results Preview Area */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("image")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "image"
                      ? "bg-[#D4AF37] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  🖼️ Poster Image Asset
                </button>
                <button
                  onClick={() => setActiveTab("seo")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "seo"
                      ? "bg-[#D4AF37] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  🔍 SEO & Social Metadata
                </button>
              </div>

              {posterResult && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4" /> Ready to Post
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm min-h-[480px] p-6 flex flex-col items-center justify-center relative">
              {loading && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20">
                  <div className="flex flex-col items-center gap-3">
                    <SparklesIcon className="w-10 h-10 text-[#D4AF37] animate-pulse" />
                    <p className="text-gray-900 font-bold text-sm">
                      Rendering Platform Poster & Applying Watermark...
                    </p>
                  </div>
                </div>
              )}

              {!posterResult && !loading && (
                <div className="flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-3">
                  <PhotoIcon className="w-16 h-16 text-gray-200" />
                  <p className="text-sm font-medium">Select your social platform and topic to generate a branded poster.</p>
                </div>
              )}

              {posterResult && activeTab === "image" && (
                <div className="w-full flex flex-col items-center space-y-6">
                  <div className="relative max-w-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-gray-950">
                    <img
                      src={posterResult.poster.dataUri}
                      alt={posterResult.seo.imageAltText}
                      className="max-h-[440px] w-auto object-contain rounded-xl"
                    />
                  </div>

                  <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      <span className="font-bold text-gray-800">{posterResult.poster.platformName}</span> ({posterResult.poster.dimensions.aspect})
                    </div>
                    <div className="flex gap-3">
                      <a
                        href={posterResult.poster.dataUri}
                        download={`Poster_${posterResult.poster.platform}_${Date.now()}.svg`}
                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" /> Download Poster
                      </a>
                      <button
                        onClick={handleCopySeo}
                        className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B8860B] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <ShareIcon className="w-4 h-4" /> {copied ? "SEO Data Copied!" : "Copy Post Content"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {posterResult && activeTab === "seo" && (
                <div className="w-full space-y-6 text-left">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">SEO Post Title</h3>
                    <p className="text-sm font-bold text-gray-900 bg-gray-50 p-3 rounded-xl border border-gray-100">{posterResult.seo.seoTitle}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Image Accessible Alt-Text</h3>
                    <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{posterResult.seo.imageAltText}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Search Engine Description</h3>
                    <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{posterResult.seo.seoDescription}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                      <TagIcon className="w-3.5 h-3.5 text-[#D4AF37]" /> Optimized Social Hashtags
                    </h3>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {posterResult.seo.hashtags.map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] font-bold px-2.5 py-1 rounded-lg">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
