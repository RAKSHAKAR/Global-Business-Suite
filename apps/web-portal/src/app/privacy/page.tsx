export default function PrivacyPage() {
  return (
    <div className="flex flex-col items-center w-full py-16">
      <section className="w-full max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Global Business Suite (GBS) Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          At Global Business Suite (GBS), we prioritize tenant data isolation and user privacy. This policy governs how we handle data across all GBS portals and services.
        </p>
        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Data Partitioning</h2>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          All client records, AI prompts, and customer interactions are partitioned logically per tenant account. Zero cross-tenant data access is permitted.
        </p>
        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">2. AI Governance & PII Protection</h2>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Prompt content dispatched to third-party LLM providers passes through real-time PII masking filters to safeguard confidential user information.
        </p>
      </section>
    </div>
  );
}
