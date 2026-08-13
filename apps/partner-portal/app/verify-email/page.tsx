"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  useEffect(() => {
    const e = searchParams.get("email");
    if (e) setEmail(e);
  }, [searchParams]);

  const handleSendOtp = async () => {
    if (!email) {
      setError("Please enter your business email address.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setDevOtp("");

    try {
      const res = await fetch("http://localhost:4000/api/v1/iam/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Verification OTP code sent to your email!");
        if (data.otp) setDevOtp(data.otp);
      } else {
        setError(data.error || "Failed to send OTP.");
      }
    } catch (err) {
      setError("Network error sending OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      setError("Email and 6-digit verification code are required.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://localhost:4000/api/v1/iam/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("🎉 Partner Email verified successfully!");
      } else {
        setError(data.error || "Verification failed.");
      }
    } catch (err) {
      setError("Network error verifying email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-[#E5E0D8]">
        <div>
          <h2 className="text-center text-2xl font-serif font-bold text-gray-900">
            Verify Partner Email
          </h2>
          <p className="mt-1 text-center text-xs text-gray-500">
            Enter your 6-digit email OTP verification code
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-semibold text-center">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold text-center">
            ✅ {message}
          </div>
        )}

        {devOtp && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl text-center font-bold font-mono">
            🔑 Dev Testing OTP Code: {devOtp}
          </div>
        )}

        <form onSubmit={handleConfirmOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Business Email Address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@tenant.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="px-3 py-2 bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                Send OTP
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Partner Email"}
          </button>
        </form>

        <div className="text-center pt-2">
          <a
            href="/"
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold hover:underline"
          >
            ← Back to Partner Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PartnerVerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-600">Loading verification page...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
