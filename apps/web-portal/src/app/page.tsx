import Link from "next/link";
import { portalUrl, portalUrls } from "./portal-config";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Hero Section */}
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-[#fdfbf7] via-white to-slate-50 pt-20 pb-28">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-blue-100/40 to-transparent blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-indigo-100/40 to-transparent blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200/80 rounded-full px-4 py-1.5 mb-8 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-900">
              GBS AI Engine Platform v3.0 Live • 16+ LLM Providers Supported
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-sans font-extrabold tracking-tight text-gray-900 mb-6 leading-tight max-w-5xl mx-auto">
            One Platform. Every Business.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              Unlimited Enterprise Growth.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Unify AI Orchestration, Multi-Tenant Governance, Google Business Profile Automation, Multi-Channel Social Studio, and CRM into one state-of-the-art platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            <Link
              href={portalUrl("partner", "/register")}
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-blue-700 transition-all hover:shadow-lg hover:-translate-y-0.5 text-center"
            >
              Partner Signup (:3001)
            </Link>
            <Link
              href={portalUrl("customer", "/register")}
              className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-black transition-all hover:shadow-lg hover:-translate-y-0.5 text-center"
            >
              Customer Signup (:3002)
            </Link>
            <Link
              href="/portals"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-gray-800 border border-gray-300 rounded-xl text-sm font-semibold tracking-wide hover:border-blue-500 hover:text-blue-600 transition-all text-center"
            >
              Explore Portals
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16 pt-10 border-t border-gray-200/60">
            <div>
              <p className="text-3xl font-extrabold text-gray-900">16+</p>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">AI Providers & Agents</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">4 Apps</p>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Unified Portals</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">3 Apps</p>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Mobile Experiences</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">100%</p>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Tenant Data Isolation</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Core Pillars Grid */}
      <section className="w-full py-24 bg-white relative z-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
              Platform Architecture
            </span>
            <h2 className="text-3xl md:text-5xl font-sans font-bold text-gray-900 mt-4 mb-4">
              Six Core Pillars of GBS
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-base">
              Engineered from the ground up for zero friction, high performance, and enterprise security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="group rounded-2xl border border-gray-200 bg-slate-50/50 p-8 hover:border-blue-500 hover:bg-white transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform shadow-md">
                  🧠
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Enterprise AI Engine
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Multi-provider model router (OpenAI, Anthropic, Gemini, DeepSeek, Mistral, Groq, Llama), 16 enterprise agents, RAG vector engine, prompt library, and budget governance.
                </p>
              </div>
              <Link href="/features#ai-engine" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center">
                Explore AI Platform &rarr;
              </Link>
            </div>

            {/* Pillar 2 */}
            <div className="group rounded-2xl border border-gray-200 bg-slate-50/50 p-8 hover:border-blue-500 hover:bg-white transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform shadow-md">
                  🛡️
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Multi-Role Governance
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Strict tenant isolation with fine-grained RBAC boundaries for Platform Admins, Franchise Partners, Business Owners, and End Customers across web & mobile.
                </p>
              </div>
              <Link href="/security" className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center">
                View Security Architecture &rarr;
              </Link>
            </div>

            {/* Pillar 3 */}
            <div className="group rounded-2xl border border-gray-200 bg-slate-50/50 p-8 hover:border-blue-500 hover:bg-white transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform shadow-md">
                  📍
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Google Business & Local SEO
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Automated Google Business Profile updates, review sentiment analysis, AI auto-replies, Q&A synchronization, and location metrics tracking.
                </p>
              </div>
              <Link href="/features#gbp" className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center">
                Learn GBP Automation &rarr;
              </Link>
            </div>

            {/* Pillar 4 */}
            <div className="group rounded-2xl border border-gray-200 bg-slate-50/50 p-8 hover:border-blue-500 hover:bg-white transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform shadow-md">
                  📱
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Social Studio & Publisher
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Multi-account campaign scheduling across Instagram, Facebook, LinkedIn, X, TikTok, and YouTube with AI visual generator and post queueing.
                </p>
              </div>
              <Link href="/features#social-studio" className="text-xs font-bold text-purple-600 hover:underline inline-flex items-center">
                Explore Social Studio &rarr;
              </Link>
            </div>

            {/* Pillar 5 */}
            <div className="group rounded-2xl border border-gray-200 bg-slate-50/50 p-8 hover:border-blue-500 hover:bg-white transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-amber-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform shadow-md">
                  💬
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Unified Inbox & AI Voice
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Consolidated messaging channels, AI phone receptionist integration, automated appointment bookings, and instant customer service bots.
                </p>
              </div>
              <Link href="/features#communications" className="text-xs font-bold text-amber-600 hover:underline inline-flex items-center">
                View Communication Tools &rarr;
              </Link>
            </div>

            {/* Pillar 6 */}
            <div className="group rounded-2xl border border-gray-200 bg-slate-50/50 p-8 hover:border-blue-500 hover:bg-white transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-cyan-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mb-6 group-hover:scale-110 transition-transform shadow-md">
                  💼
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  CRM & Subscription Billing
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Lead pipelines, customer profiles, organization management, automated invoices, and usage-based AI token quota enforcement.
                </p>
              </div>
              <Link href="/pricing" className="text-xs font-bold text-cyan-600 hover:underline inline-flex items-center">
                View Pricing & CRM &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Portals Showcase Section */}
      <section className="w-full bg-slate-900 text-white py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-950/80 px-3.5 py-1.5 rounded-full border border-blue-800">
              Ecosystem Access Points
            </span>
            <h2 className="text-3xl md:text-5xl font-sans font-bold text-white mt-4 mb-4">
              4 Web Portals & 3 Mobile Applications
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-base">
              A synchronized suite engineered for every persona in your business hierarchy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md border border-blue-500/30">Port 3000</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Admin Portal</h4>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                Global platform administration, AI provider keys, tenant management, governance policies, and system audit logs.
              </p>
              <a href={portalUrls.admin} className="w-full block text-center py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors">
                Launch Admin Portal &rarr;
              </a>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-500/30">Port 3001</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Partner Portal</h4>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                Agency and franchise management, AI Studio content creation, client CRM, social media scheduling, and GBP tools.
              </p>
              <a href={portalUrls.partner} className="w-full block text-center py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors">
                Launch Partner Portal &rarr;
              </a>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/30">Port 3002</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Customer Portal</h4>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                End customer self-service hub, appointment booking, AI assistant chat, service orders, and billing invoices.
              </p>
              <a href={portalUrls.customer} className="w-full block text-center py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors">
                Launch Customer Portal &rarr;
              </a>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-md border border-purple-500/30">Ports 8081-8083</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Mobile Applications</h4>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                Expo / React Native cross-platform mobile experiences for Admins (8081), Partners (8082), and Customers (8083).
              </p>
              <Link href="/portals#mobile" className="w-full block text-center py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors">
                View Mobile Apps &rarr;
              </Link>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/portals" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300">
              View Full Portal Credentials & Architecture Directory &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-black py-28 relative overflow-hidden text-center">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl md:text-5xl font-sans font-extrabold text-white mb-6">
            Ready to Scale Your Business Operations?
          </h2>
          <p className="text-gray-400 text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of organizations running on Global Business Suite (GBS). Create your partner account or explore developer documentation today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={portalUrl("partner", "/register")}
              className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-xl text-sm font-bold tracking-wide hover:bg-blue-500 transition-colors shadow-lg"
            >
              Get Started as Partner
            </Link>
            <a
              href="http://localhost:4000/api-docs"
              className="w-full sm:w-auto px-10 py-4 bg-gray-800 text-gray-200 border border-gray-700 rounded-xl text-sm font-semibold tracking-wide hover:bg-gray-700 hover:text-white transition-colors"
            >
              API Swagger Documentation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
