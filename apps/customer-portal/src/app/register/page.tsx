"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Captcha } from "@/components/Captcha";
import { API_BASE } from "@/lib/api";

export default function CustomerRegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [captchaId, setCaptchaId] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);

  const handleCaptchaValidate = (id: string, token: string, isVerified: boolean) => {
    setCaptchaId(id);
    setCaptchaToken(token);
    setIsCaptchaVerified(isVerified);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!captchaToken || !isCaptchaVerified) {
      setError("Please verify the Security CAPTCHA code first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role: "CUSTOMER_USER",
          captchaId,
          captchaToken,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Customer Account registered successfully! You can now log in.");
      } else {
        setError(data.error || "Registration failed.");
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 mb-2 font-black text-xl shadow-sm">
            GBS
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Customer Account
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Sign up to access AI Social Assistant & Analytics
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold text-center space-y-2">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Morgan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

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
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="pt-1">
              <Captcha onValidate={handleCaptchaValidate} />
            </div>

            <button
              type="submit"
              disabled={loading || !isCaptchaVerified}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Creating Account..." : "Create Customer Account"}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
