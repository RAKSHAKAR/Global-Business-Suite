"use client";

import React, { useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

export default function CustomerForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devResetToken, setDevResetToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevResetToken("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Password reset instructions sent.");
        if (data.resetToken) {
          setDevResetToken(data.resetToken);
        }
      } else {
        setError(data.error || "Failed to process password reset request.");
      }
    } catch (err) {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-2xl border border-slate-200">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reset Password
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter your email address to receive password reset instructions.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center font-medium">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl text-center font-semibold">
            ✅ {message}
          </div>
        )}

        {devResetToken && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl text-center space-y-2">
            <p className="font-bold">🔑 Developer Simulation Token:</p>
            <p className="font-mono text-xs break-all bg-white p-2 rounded border">{devResetToken}</p>
            <Link
              href={`/reset-password?token=${devResetToken}&email=${encodeURIComponent(email)}`}
              className="inline-block px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-xs"
            >
              Go to Reset Password Form →
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@demo.com"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Sending Instructions..." : "Send Reset Link"}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
          >
            ← Back to Customer Login
          </Link>
        </div>
      </div>
    </div>
  );
}
