"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    const e = searchParams.get("email");
    if (t) setToken(t);
    if (e) setEmail(e);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Password reset successfully. Please log in with your new password.");
      } else {
        setError(data.error || "Password reset failed.");
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
            Set New Password
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter your reset token and new password below.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl text-center font-semibold space-y-2">
            <p>✅ {message}</p>
            <Link
              href="/login"
              className="inline-block mt-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition-all"
            >
              Sign In to Customer Portal →
            </Link>
          </div>
        )}

        {!message && (
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reset Token
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter reset token"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        )}

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

export default function CustomerResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Loading reset form...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
