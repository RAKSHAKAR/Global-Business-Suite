import { portalUrls } from "../portal-config";

export default function SolutionsPage() {
  return (
    <div className="flex flex-col items-center w-full py-16">
      <section className="w-full max-w-7xl mx-auto px-6 text-center mb-16">
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
          Built for Multi-Role Operations
        </span>
        <h1 className="text-4xl md:text-6xl font-sans font-extrabold text-gray-900 mt-4 mb-6">
          Solutions by Role & Persona
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Tailored user experiences, administrative controls, and mobile apps designed for every stakeholder in your organization.
        </p>
      </section>

      <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Solution 1: Platform Admins */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs hover:border-blue-500 transition-colors">
          <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md mb-4 inline-block font-semibold">
            Admin Portal & Mobile (:3000 / :8081)
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">For Enterprise Admins & Platform Owners</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Centralized platform control over AI provider keys, multi-tenant organizations, system billing, RBAC security roles, PII governance rules, and global search analytics.
          </p>
          <ul className="space-y-2.5 text-xs text-gray-700 mb-8">
            <li className="flex items-center gap-2 font-medium">✓ Provider Failover & Cost Budget Caps</li>
            <li className="flex items-center gap-2 font-medium">✓ Tenant Partitioning & System Audit Logging</li>
            <li className="flex items-center gap-2 font-medium">✓ Role Simulation & Multi-Tenant Access Overrides</li>
          </ul>
          <a href={portalUrls.admin} className="inline-flex text-xs font-bold text-blue-600 hover:underline">
            Launch Platform Admin Portal &rarr;
          </a>
        </div>

        {/* Solution 2: Agency Partners */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs hover:border-indigo-500 transition-colors">
          <span className="text-xs font-mono bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-md mb-4 inline-block font-semibold">
            Partner Portal & Mobile (:3001 / :8082)
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">For Franchises, Agencies & Business Owners</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Manage dozens of client accounts, build multi-channel social campaigns, generate AI content, publish Google Business Profile posts, and analyze team productivity.
          </p>
          <ul className="space-y-2.5 text-xs text-gray-700 mb-8">
            <li className="flex items-center gap-2 font-medium">✓ AI Content Studio (12 Generative Formats)</li>
            <li className="flex items-center gap-2 font-medium">✓ Google Business Profile Auto-Reply & Posts</li>
            <li className="flex items-center gap-2 font-medium">✓ Client CRM & Service Pipeline Tracking</li>
          </ul>
          <a href={portalUrls.partner} className="inline-flex text-xs font-bold text-indigo-600 hover:underline">
            Launch Agency Partner Portal &rarr;
          </a>
        </div>

        {/* Solution 3: Customers */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs hover:border-emerald-500 transition-colors">
          <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md mb-4 inline-block font-semibold">
            Customer Portal & Mobile (:3002 / :8083)
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">For End Clients & Consumers</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Empower your customers with a self-service dashboard to request phone calls, book appointments, track active service orders, chat with AI support, and pay invoices.
          </p>
          <ul className="space-y-2.5 text-xs text-gray-700 mb-8">
            <li className="flex items-center gap-2 font-medium">✓ Automated Appointment Scheduler</li>
            <li className="flex items-center gap-2 font-medium">✓ 24/7 AI FAQ Assistant & Knowledge Search</li>
            <li className="flex items-center gap-2 font-medium">✓ Invoices & Real-Time Order Updates</li>
          </ul>
          <a href={portalUrls.customer} className="inline-flex text-xs font-bold text-emerald-600 hover:underline">
            Launch Customer Self-Service Portal &rarr;
          </a>
        </div>

        {/* Solution 4: Developer & API */}
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs hover:border-purple-500 transition-colors">
          <span className="text-xs font-mono bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md mb-4 inline-block font-semibold">
            REST API & Webhooks (:4000)
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">For Developers & System Integrators</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            Clean, fully documented RESTful API endpoints for CRM, AI Agent execution, GBP sync, messaging webhooks, and JWT authentication flows.
          </p>
          <ul className="space-y-2.5 text-xs text-gray-700 mb-8">
            <li className="flex items-center gap-2 font-medium">✓ OpenAPI 3.0 / Swagger Interactive Docs</li>
            <li className="flex items-center gap-2 font-medium">✓ Tenant Scoped API Key Authentication</li>
            <li className="flex items-center gap-2 font-medium">✓ Automated Event Webhook Triggers</li>
          </ul>
          <a href="http://localhost:4000/api-docs" className="inline-flex text-xs font-bold text-purple-600 hover:underline">
            Open API Documentation &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
