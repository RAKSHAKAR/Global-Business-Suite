"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { SparklesIcon, PaperAirplaneIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

const tools = [
  { id: "HELP", name: "AI Help Assistant", desc: "General portal navigation & platform guidance" },
  { id: "KNOWLEDGE", name: "AI Knowledge Search", desc: "Search platform knowledge base & docs" },
  { id: "FAQ", name: "AI FAQ Assistant", desc: "Instant answers for billing & service FAQs" },
  { id: "DOCUMENT", name: "AI Document Search", desc: "Scan invoices, contracts, & reports" },
  { id: "RECOMMENDATION", name: "AI Recommendation Engine", desc: "Personalized growth recommendations" },
  { id: "APPOINTMENT", name: "AI Appointment Assistant", desc: "Find open meeting slots & book" },
  { id: "SUPPORT", name: "AI Support Assistant", desc: "Troubleshoot issues & draft ticket details" },
];

export default function AiAssistantPage() {
  const { token } = useAuth();
  const [selectedTool, setSelectedTool] = useState("HELP");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !token) return;

    setLoading(true);
    try {
      const data = await apiRequest<any>("/api/v1/customer/ai/assistant", token, {
        method: "POST",
        body: JSON.stringify({ toolType: selectedTool, query: prompt }),
      });
      setResponse(data);
    } catch (error) {
      setResponse({ response: error instanceof Error ? error.message : "AI assistant is unavailable." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-7 h-7 text-purple-600" /> Specialized AI Assistant Studio
          </h1>
          <p className="text-sm text-gray-500">Access 7 domain-tailored AI engines for instant answers, document search, and smart recommendations.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTool(t.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedTool === t.id
                  ? "bg-purple-50 border-purple-300 text-purple-900 shadow-sm"
                  : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <h4 className="font-bold text-xs">{t.name}</h4>
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{t.desc}</p>
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <form onSubmit={handleGenerate} className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Ask ${tools.find((t) => t.id === selectedTool)?.name}...`}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
            >
              <PaperAirplaneIcon className="w-4 h-4" /> {loading ? "Analyzing..." : "Ask AI"}
            </button>
          </form>

          {response && (
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-purple-950 text-sm leading-relaxed space-y-2">
              <h4 className="font-bold text-purple-900 flex items-center gap-1">
                <SparklesIcon className="w-4 h-4 text-purple-600" /> Response:
              </h4>
              <p>{response.response}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
