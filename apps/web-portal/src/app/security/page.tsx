import Link from "next/link";

export default function SecurityPage() {
  return (
    <div className="flex flex-col items-center w-full py-16">
      <section className="w-full max-w-4xl mx-auto px-6 text-center mb-16">
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100">
          Zero-Trust Security & Compliance
        </span>
        <h1 className="text-4xl md:text-6xl font-sans font-extrabold text-gray-900 mt-4 mb-6">
          Enterprise Multi-Tenant Security
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          How Global Business Suite safeguards tenant data, enforces granular RBAC permissions, and mitigates security vulnerabilities.
        </p>
      </section>

      <div className="w-full max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-4">🔐</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Tenant Boundary Isolation</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Every database query and API call is scoped strictly to the authenticated tenant context, preventing cross-tenant data leaks.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold mb-4">🛡️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Role-Based Access Control (RBAC)</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Role hierarchy spanning Platform Admin, Partner Admin, Manager, Agent, and Customer accounts with fine-grained permission flags.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold mb-4">🤖</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI Governance & PII Protection</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Automated PII masking scrubs sensitive customer identifiers before sending prompts to third-party LLM providers.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold mb-4">🔑</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Auth, Captcha & MFA</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Google OAuth SSO, reCAPTCHA v2/v3 bot defense, TOTP Multi-Factor Authentication, and rate-limited auth endpoints.
          </p>
        </div>
      </div>
    </div>
  );
}
