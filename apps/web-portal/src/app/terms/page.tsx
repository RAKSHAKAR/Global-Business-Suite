export default function TermsPage() {
  return (
    <div className="flex flex-col items-center w-full py-16">
      <section className="w-full max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          By accessing or using Global Business Suite (GBS), you agree to comply with our multi-tenant usage policies, API rate limits, and token quota allocations.
        </p>
        <h2 className="text-lg font-bold text-gray-900 mt-6 mb-2">1. Subscription Terms</h2>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Starter, Professional, and Enterprise plans include dedicated AI token allowances. Additional usage is billed according to published rate cards.
        </p>
      </section>
    </div>
  );
}
