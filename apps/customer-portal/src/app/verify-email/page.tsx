"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

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
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setDevOtp("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/iam/verify-email/send`, {
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
      const res = await fetch(`${API_BASE}/api/v1/iam/verify-email/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("🎉 Email verified successfully!");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-2xl border border-slate-200">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Verify Email Address
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter your 6-digit email OTP verification code
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@demo.com"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                Send OTP
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              6-Digit Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
          >
            ← Back to Customer Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CustomerVerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Loading verification page...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
