import Link from "next/link";

export default function CareersPage() {
  return (
    <div className="flex flex-col items-center w-full py-16 text-center">
      <section className="w-full max-w-3xl mx-auto px-6">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
          Join GBS Engineering
        </span>
        <h1 className="text-4xl font-extrabold text-gray-900 mt-4 mb-4">Build the Future of Enterprise AI</h1>
        <p className="text-sm text-gray-600 mb-8 leading-relaxed">
          We are continuously seeking world-class full-stack engineers, AI researchers, security specialists, and UI/UX designers.
        </p>
        <Link href="/contact" className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
          View Open Engineering Roles &rarr;
        </Link>
      </section>
    </div>
  );
}
