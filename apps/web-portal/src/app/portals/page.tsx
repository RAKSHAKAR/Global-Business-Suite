import Link from "next/link";
import { portalUrls } from "../portal-config";

export default function PortalsPage() {
  return (
    <div className="flex flex-col items-center w-full py-16">
      <section className="w-full max-w-4xl mx-auto px-6 text-center mb-16">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
          Orchestration Directory
        </span>
        <h1 className="text-4xl md:text-6xl font-sans font-extrabold text-gray-900 mt-4 mb-6">
          GBS Portals & Applications Hub
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Quick-access portal directory for developers, administrators, agency partners, and customers.
        </p>
      </section>

      <div className="w-full max-w-6xl mx-auto px-6 space-y-12">
        {/* Web Portals Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>🌐</span> Web Portals (Next.js 16 Applications)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2.5 py-1 rounded font-bold">Port 3000</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Platform Admin Portal</h3>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Global configuration, AI provider management, prompt library, governance policies, organization directory, audit logs.
              </p>
              <p className="text-xs font-mono text-gray-500 mb-4 bg-slate-50 p-2 rounded">
                Default: admin@enterprise.com / Admin@1234!
              </p>
              <a href={portalUrls.admin} className="inline-block w-full text-center py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
                Open Admin Portal (:3000) &rarr;
              </a>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs hover:border-indigo-500 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded font-bold">Port 3001</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Agency Partner Portal</h3>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Agency operations, AI Studio, GBP post automation & review management, social campaign scheduler, CRM leads.
              </p>
              <p className="text-xs font-mono text-gray-500 mb-4 bg-slate-50 p-2 rounded">
                Default: partner@demo.com / Partner@1234!
              </p>
              <a href={portalUrls.partner} className="inline-block w-full text-center py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors">
                Open Partner Portal (:3001) &rarr;
              </a>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs hover:border-emerald-500 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded font-bold">Port 3002</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Active</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Customer Service Portal</h3>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Client self-service dashboard, booking requests, AI support bot, service orders, documents, invoices.
              </p>
              <p className="text-xs font-mono text-gray-500 mb-4 bg-slate-50 p-2 rounded">
                Default: customer@demo.com / Customer@1234!
              </p>
              <a href={portalUrls.customer} className="inline-block w-full text-center py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors">
                Open Customer Portal (:3002) &rarr;
              </a>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs hover:border-slate-500 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono bg-slate-100 text-slate-800 px-2.5 py-1 rounded font-bold">Port 3003</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Current</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Public Web Portal</h3>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Public website, feature matrix, pricing subscription plans, security documentation, contact forms.
              </p>
              <p className="text-xs font-mono text-gray-500 mb-4 bg-slate-50 p-2 rounded">
                Public Landing Page (Current Session)
              </p>
              <Link href="/" className="inline-block w-full text-center py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors">
                Current Web Portal Home &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Applications Section */}
        <div id="mobile">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span>📱</span> Mobile Web Applications (Expo / React Native)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800">
              <span className="text-xs font-mono bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded border border-blue-500/30 mb-3 inline-block">Port 8081</span>
              <h3 className="text-base font-bold text-white mb-2">Admin Mobile Web</h3>
              <p className="text-slate-400 text-xs mb-4">Mobile platform control, provider status alerts, and high-level system analytics.</p>
              <a href="http://localhost:8081" className="block text-center py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors">
                Launch Admin Mobile (:8081) &rarr;
              </a>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800">
              <span className="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded border border-indigo-500/30 mb-3 inline-block">Port 8082</span>
              <h3 className="text-base font-bold text-white mb-2">Partner Mobile Web</h3>
              <p className="text-slate-400 text-xs mb-4">Mobile social posting, instant lead notifications, and client CRM management.</p>
              <a href="http://localhost:8082" className="block text-center py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors">
                Launch Partner Mobile (:8082) &rarr;
              </a>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800">
              <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded border border-emerald-500/30 mb-3 inline-block">Port 8083</span>
              <h3 className="text-base font-bold text-white mb-2">Customer Mobile Web</h3>
              <p className="text-slate-400 text-xs mb-4">Mobile appointment scheduling, AI support assistant, and service tracking.</p>
              <a href="http://localhost:8083" className="block text-center py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 transition-colors">
                Launch Customer Mobile (:8083) &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
