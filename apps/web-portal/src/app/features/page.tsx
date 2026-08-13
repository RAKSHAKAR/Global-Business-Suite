import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="flex flex-col items-center w-full py-16">
      {/* Header */}
      <section className="w-full max-w-7xl mx-auto px-6 text-center mb-16">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
          Complete Enterprise Matrix
        </span>
        <h1 className="text-4xl md:text-6xl font-sans font-extrabold text-gray-900 mt-4 mb-6">
          Global Business Suite Capabilities
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Deep dive into the 6 enterprise pillars driving multi-tenant operations, AI automation, and omni-channel growth.
        </p>
      </section>

      {/* Feature Sections */}
      <div className="w-full max-w-7xl mx-auto px-6 space-y-16">
        {/* Feature 1: AI Engine */}
        <div id="ai-engine" className="bg-white rounded-3xl border border-gray-200 p-8 md:p-12 shadow-xs hover:border-blue-500 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold">🧠</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">1. Enterprise AI Engine & Studio</h2>
          </div>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Multi-provider routing engine with zero vendor lock-in. Intelligent failover across 16+ LLM adapters including OpenAI, Anthropic, Gemini 2.5, DeepSeek R1/V3, Mistral, Groq, Cohere, Bedrock, and Azure OpenAI.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">16 Enterprise AI Agents</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Dedicated agents for Copywriting, SEO, Review Auto-Replies, Lead Scoring, Social Content, and Code Generation.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">RAG & Vector Search</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Upload business documents, PDFs, and guides to build custom tenant knowledge bases powered by cosine similarity.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">AI Budget Governance</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Real-time PII masking, token spend caps, usage rate limits, and audit logs per partner organization.</p>
            </div>
          </div>
        </div>

        {/* Feature 2: GBP */}
        <div id="gbp" className="bg-white rounded-3xl border border-gray-200 p-8 md:p-12 shadow-xs hover:border-emerald-500 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold">📍</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">2. Google Business Profile & Local SEO</h2>
          </div>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Direct Google Business Profile API integration for single and multi-location businesses. Sync posts, reviews, Q&As, photos, and location hours in real time.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Automated Review Replies</h4>
              <p className="text-xs text-gray-500 leading-relaxed">AI sentiment analysis categorizes customer reviews and drafts localized responses for manager approval.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Post & Offer Publisher</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Schedule promotional updates, events, and seasonal offers directly to Google Maps and Search listings.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Location Health Score</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Monitor search views, call clicks, directional inquiries, and profile completeness benchmarks.</p>
            </div>
          </div>
        </div>

        {/* Feature 3: Social Studio */}
        <div id="social-studio" className="bg-white rounded-3xl border border-gray-200 p-8 md:p-12 shadow-xs hover:border-purple-500 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg font-bold">📱</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">3. Omnichannel Social Studio</h2>
          </div>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Centralized publishing engine supporting Instagram, Facebook Pages & Groups, LinkedIn Profiles & Companies, X (Twitter), TikTok, and YouTube Shorts.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Visual Calendar Planner</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Drag-and-drop content calendar with time-slot optimization and multi-account queuing.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">AI Graphic & Caption Assistant</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Generate multi-variant post captions, hashtag suggestions, and AI artwork in seconds.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Cross-Channel Analytics</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Track impressions, engagement rates, click-through rates, and audience growth across networks.</p>
            </div>
          </div>
        </div>

        {/* Feature 4: Unified Communications */}
        <div id="communications" className="bg-white rounded-3xl border border-gray-200 p-8 md:p-12 shadow-xs hover:border-amber-500 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center text-lg font-bold">💬</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">4. Unified Inbox & AI Voice Call Center</h2>
          </div>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Consolidate customer inquiries from web live chat, email, SMS, WhatsApp, and Google Messages into a single unified stream.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">AI Voice Receptionist</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Interactive voice AI handles incoming phone calls, answers FAQs, and logs appointment requests.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Booking Engine Integration</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Direct integration with appointment calendars, service providers, and technician dispatch systems.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-2 text-sm">Omnichannel Inbox</h4>
              <p className="text-xs text-gray-500 leading-relaxed">Team inbox with ticket routing, internal notes, customer contact history, and auto-tagging.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-20 text-center">
        <Link href="/portals" className="px-8 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          View All Portal Environments &rarr;
        </Link>
      </div>
    </div>
  );
}
