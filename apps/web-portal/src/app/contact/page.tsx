"use client";

import { FormEvent, useState } from "react";
import { Captcha } from "../../components/Captcha";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

export default function ContactPage() {
  const [captcha, setCaptcha] = useState({ id: "", token: "", verified: false });
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setResult(null);
    if (!captcha.verified) {
      setResult({ type: "error", message: "Complete the CAPTCHA before submitting your request." });
      return;
    }

    const data = new FormData(form);
    const fullName = String(data.get("fullName") || "").trim();
    const [firstName, ...lastParts] = fullName.split(/\s+/);
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName: lastParts.join(" "),
          email: String(data.get("email") || "").trim(),
          companyName: String(data.get("companyName") || "").trim(),
          notes: String(data.get("message") || "").trim(),
          captchaId: captcha.id,
          captchaToken: captcha.token,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The request could not be submitted.");
      setResult({ type: "success", message: body.message || "Your request has been submitted." });
      form.reset();
      setCaptcha({ id: "", token: "", verified: false });
      setCaptchaVersion((version) => version + 1);
    } catch (error) {
      setResult({ type: "error", message: error instanceof Error ? error.message : "The request could not be submitted." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full py-16">
      <section className="w-full max-w-3xl mx-auto px-6 text-center mb-12">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
          Enterprise Engagement
        </span>
        <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-gray-900 mt-4 mb-4">
          Contact Sales & Support
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">
          Request an enterprise product demonstration or get in touch with our solutions architecture team.
        </p>
      </section>

      <div className="w-full max-w-xl mx-auto px-6 bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="contact-full-name" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Full Name</label>
            <input id="contact-full-name" name="fullName" required type="text" placeholder="John Doe" className="w-full px-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Work Email</label>
            <input id="contact-email" name="email" required type="email" placeholder="john@company.com" className="w-full px-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label htmlFor="contact-company" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Organization / Agency</label>
            <input id="contact-company" name="companyName" required type="text" placeholder="Acme Enterprise" className="w-full px-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-600" />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Message / Requirements</label>
            <textarea id="contact-message" name="message" required rows={4} placeholder="Describe your operational scale and AI integration requirements..." className="w-full px-4 py-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-600"></textarea>
          </div>
          <Captcha key={captchaVersion} onChange={setCaptcha} />
          {result && (
            <p role={result.type === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm font-semibold ${result.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {result.message}
            </p>
          )}
          <button disabled={submitting || !captcha.verified} type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit Demo Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
