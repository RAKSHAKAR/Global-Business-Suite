"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

export default function FilesPage() {
  const { token } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [fileType, setFileType] = useState("IMAGE");

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/partner/files`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAssets(data.assets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleUpload = async () => {
    if (!name || !token) return;
    try {
      const res = await fetch(`${API}/api/v1/partner/files/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          fileType,
          fileUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setAssets([created, ...assets]);
        setName("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 p-6 bg-[#121212] min-h-screen text-white">
      <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            📁 Media Storage & Asset Vault
          </h1>
          <p className="text-xs text-gray-400">Organize images, videos, documents, marketing assets, and AI-generated files.</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="File Name (e.g. Agency Brand Kit.png)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[#242424] border border-[#333] px-3 py-2 rounded-xl text-xs text-white focus:outline-none flex-1 min-w-[200px]"
        />
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          className="bg-[#242424] border border-[#333] px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
        >
          <option value="IMAGE">Image</option>
          <option value="VIDEO">Video</option>
          <option value="DOCUMENT">Document</option>
          <option value="MARKETING_ASSET">Marketing Asset</option>
          <option value="AI_GENERATED">AI Generated File</option>
        </select>
        <button
          onClick={handleUpload}
          className="bg-[#D4AF37] hover:bg-[#b8972e] text-black font-bold px-4 py-2 rounded-xl text-xs transition-all"
        >
          + Upload Asset
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] shadow-md">
        <h2 className="text-base font-bold text-[#D4AF37] mb-4">Storage Gallery ({assets.length} Files)</h2>
        {loading ? (
          <p className="text-xs text-gray-400">Loading files...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map((a) => (
              <div key={a.id} className="p-3 rounded-xl bg-[#242424] border border-[#333] space-y-2">
                <div className="w-full h-32 bg-[#1A1A1A] rounded-lg overflow-hidden flex items-center justify-center">
                  {a.fileType === "IMAGE" || a.fileType === "AI_GENERATED" ? (
                    <img src={a.fileUrl} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">📄</span>
                  )}
                </div>
                <p className="text-xs font-bold truncate">{a.name}</p>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-[#D4AF37]/20 text-[#D4AF37]">
                  {a.fileType}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
