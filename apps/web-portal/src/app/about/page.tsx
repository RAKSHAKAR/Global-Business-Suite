import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center w-full py-16">
      <section className="w-full max-w-4xl mx-auto px-6 text-center mb-16">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
          About Global Business Suite
        </span>
        <h1 className="text-4xl md:text-6xl font-sans font-extrabold text-gray-900 mt-4 mb-6">
          Architected for Enterprise Excellence
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Global Business Suite (GBS) is an enterprise-grade SaaS operating system unifying multi-provider AI orchestration, local business automation, omnichannel social publishing, and tenant governance.
        </p>
      </section>

      <div className="w-full max-w-5xl mx-auto px-6 space-y-12">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 md:p-10 shadow-xs">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Core Architectural Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-bold text-gray-900 mb-1">1. Zero Vendor Lock-in</h4>
              <p className="leading-relaxed">Our AI Engine seamlessly routes requests between 16+ LLM providers with automatic fallback and budget capping.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">2. Strict Multi-Tenancy</h4>
              <p className="leading-relaxed">Database partitions, tenant-scoped API middleware, and RBAC roles guarantee 100% data isolation.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">3. Automated Testing Mandatory</h4>
              <p className="leading-relaxed">Every feature is backed by programmatically executable automated E2E, unit, and API integration test suites.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-1">4. Responsive & Accessible UI</h4>
              <p className="leading-relaxed">Standardized GBS CSS Design Tokens ensure high contrast, keyboard accessibility, and glassmorphism elegance.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-10">
          <h2 className="text-2xl font-bold mb-4">Technology Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">Next.js 16 (App Router)</div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">Express Microservices</div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">Prisma ORM</div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">PostgreSQL / SQLite</div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">Expo / React Native</div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">16+ AI Provider SDKs</div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">Google Business API</div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">Jest / Playwright</div>
          </div>
        </div>
      </div>
    </div>
  );
}
