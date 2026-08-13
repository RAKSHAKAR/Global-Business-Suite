import Link from "next/link";
import { portalUrl } from "../portal-config";

export default function Pricing() {
  return (
    <div className="flex flex-col items-center pb-24 w-full">
      {/* Header */}
      <section className="w-full pt-20 pb-12 bg-gradient-to-b from-[#fdfbf7] to-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Flexible Enterprise Plans
          </span>
          <h1 className="text-4xl md:text-6xl font-sans font-extrabold text-gray-900 mt-4 mb-6">
            Transparent Pricing for Every Scale
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Choose the subscription plan that aligns with your operational size. Upgrade or adjust AI token quotas at any time.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="w-full max-w-7xl mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Starter Plan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col hover:border-blue-500 transition-colors hover:shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
            <p className="text-gray-500 text-sm mb-6 h-12">
              For local merchants and small business owners needing basic automation.
            </p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold text-gray-900">
                $49
              </span>
              <span className="text-gray-500 font-medium">/month</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-emerald-500 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Up to 10 Active Clients / Locations
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-emerald-500 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Google Business Profile Post Auto-Sync
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-emerald-500 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Social Studio (FB, IG, LinkedIn, X)
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-emerald-500 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                50,000 AI Tokens / month
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-emerald-500 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Unified Customer Inbox
              </li>
            </ul>
            <Link
              href={portalUrl("customer", "/register")}
              className="w-full block text-center py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-gray-900 rounded-xl font-semibold transition-colors"
            >
              Start Customer Plan (:3002)
            </Link>
          </div>

          {/* Professional Plan */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 flex flex-col relative transform md:-translate-y-3 shadow-2xl text-white">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase shadow-md">
              Most Popular Partner Plan
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Professional Partner
            </h3>
            <p className="text-slate-400 text-sm mb-6 h-12">
              Ideal for marketing agencies, franchise operators, and growing firms.
            </p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold text-white">
                $129
              </span>
              <span className="text-slate-400 font-medium">/month</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-center text-sm text-slate-200">
                <span className="w-5 h-5 text-blue-400 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Unlimited Client CRM Profiles
              </li>
              <li className="flex items-center text-sm text-slate-200">
                <span className="w-5 h-5 text-blue-400 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Full AI Studio (12 Content Types)
              </li>
              <li className="flex items-center text-sm text-slate-200">
                <span className="w-5 h-5 text-blue-400 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                RAG Vector Engine & Document Search
              </li>
              <li className="flex items-center text-sm text-slate-200">
                <span className="w-5 h-5 text-blue-400 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                500,000 AI Tokens / month
              </li>
              <li className="flex items-center text-sm text-slate-200">
                <span className="w-5 h-5 text-blue-400 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                GBP Auto-Replies & Review Sentiment
              </li>
              <li className="flex items-center text-sm text-slate-200">
                <span className="w-5 h-5 text-blue-400 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Partner Mobile App Access (:8082)
              </li>
            </ul>
            <Link
              href={portalUrl("partner", "/register")}
              className="w-full block text-center py-3.5 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold tracking-wide transition-colors shadow-lg"
            >
              Start Partner Plan (:3001)
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col hover:border-blue-500 transition-colors hover:shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Enterprise Suite
            </h3>
            <p className="text-gray-500 text-sm mb-6 h-12">
              Multi-tenant architecture for large networks, multi-franchise systems & white-labelers.
            </p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold text-gray-900">
                $399
              </span>
              <span className="text-gray-500 font-medium">/month</span>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-indigo-600 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Everything in Professional
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-indigo-600 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Custom AI Provider API Keys & Failover
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-indigo-600 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Custom Token Quota Allocations
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-indigo-600 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Dedicated Multi-Tenant Isolation SLA
              </li>
              <li className="flex items-center text-sm text-gray-700">
                <span className="w-5 h-5 text-indigo-600 mr-3 shrink-0 flex items-center justify-center font-bold">✓</span>
                Platform Admin Portal Access (:3000)
              </li>
            </ul>
            <Link
              href="/contact"
              className="w-full block text-center py-3.5 px-6 bg-slate-900 hover:bg-black text-white rounded-xl font-semibold transition-colors"
            >
              Contact Enterprise Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
