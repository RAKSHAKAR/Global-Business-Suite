"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../AuthContext";
import { Captcha } from "@/components/Captcha";
import { API_BASE } from "@/lib/api";

export default function CustomerLoginPage() {
  const [authMode, setAuthMode] = useState<"email" | "mobile">("email");
  
  // Email Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Mobile / OTP Form State
  const [mobileIdentifier, setMobileIdentifier] = useState("");
  const [otpChannel, setOtpChannel] = useState<"SMS" | "WHATSAPP" | "EMAIL">("SMS");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSuccessMessage, setOtpSuccessMessage] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  // Security CAPTCHA State
  const [captchaId, setCaptchaId] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleCaptchaValidate = (id: string, token: string, isVerified: boolean) => {
    setCaptchaId(id);
    setCaptchaToken(token);
    setIsCaptchaVerified(isVerified);
    if (isVerified) {
      setError("");
    }
  };

  // ── 1. Handle Password Login ──
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!captchaToken || !isCaptchaVerified) {
      setError("Please verify the Security CAPTCHA code first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaId, captchaToken }),
      });

      const data = await res.json();
      const payload = data.data || data;

      if (res.ok && payload.token) {
        login(payload.token, payload.user);
      } else {
        setError(data.error || payload.message || "Login failed. Check your credentials.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── 2. Handle Request Mobile OTP ──
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpSuccessMessage("");

    if (!mobileIdentifier.trim()) {
      setError("Please enter a valid mobile number or email address.");
      return;
    }

    if (!captchaToken || !isCaptchaVerified) {
      setError("Please verify the Security CAPTCHA code first.");
      return;
    }

    setOtpSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: mobileIdentifier.trim(),
          channel: otpChannel,
        }),
      });

      const data = await res.json();
      const payload = data.data || data;

      if (res.ok && (data.success || payload.success)) {
        setOtpSent(true);
        const demoInfo = payload.otp ? ` (Demo Code: ${payload.otp})` : "";
        setOtpSuccessMessage(`OTP sent successfully via ${otpChannel} to ${mobileIdentifier}${demoInfo}`);
      } else {
        setError(data.error || payload.message || "Failed to send OTP code.");
      }
    } catch (err: any) {
      setError("Failed to connect to authentication server for OTP dispatch.");
    } finally {
      setOtpSending(false);
    }
  };

  // ── 3. Handle Verify Mobile OTP ──
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: mobileIdentifier.trim(),
          token: otpCode.trim(),
          channel: otpChannel,
        }),
      });

      const data = await res.json();
      const payload = data.data || data;

      if (res.ok && payload.token) {
        login(payload.token, payload.user);
      } else {
        setError(data.error || payload.message || "Invalid or expired OTP code.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred during OTP verification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-2xl border border-slate-200">
        
        {/* Portal Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 mb-3 font-black text-2xl shadow-sm">
            GBS
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Customer Portal
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to access your subscriptions, services & portal dashboard.
          </p>
        </div>

        {/* Authentication Mode Switcher Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode("email");
              setError("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              authMode === "email"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ✉️ Email & Password
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("mobile");
              setError("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              authMode === "mobile"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📱 Mobile / Phone OTP
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
            ⚠️ {error}
          </div>
        )}

        {otpSuccessMessage && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl font-medium text-center">
            ✅ {otpSuccessMessage}
          </div>
        )}

        {/* ── MODE 1: Email & Password Form ── */}
        {authMode === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="customer@demo.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {/* Mandatory Security CAPTCHA */}
            <Captcha onValidate={handleCaptchaValidate} />

            <button
              type="submit"
              disabled={loading || !isCaptchaVerified}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? "Authenticating..." : "Sign In to Customer Portal"}
            </button>
          </form>
        ) : (
          /* ── MODE 2: Mobile / Phone OTP Form ── */
          <div className="space-y-4">
            {/* Channel Selection Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Dispatch Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "SMS", label: "💬 SMS" },
                  { id: "WHATSAPP", label: "🟢 WhatsApp" },
                  { id: "EMAIL", label: "📧 Email OTP" },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setOtpChannel(ch.id as any);
                      setOtpSent(false);
                      setError("");
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      otpChannel === ch.id
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {!otpSent ? (
              /* Request OTP Form */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {otpChannel === "EMAIL" ? "Email Address" : "Mobile / Phone Number"}
                  </label>
                  <input
                    type="text"
                    required
                    value={mobileIdentifier}
                    onChange={(e) => setMobileIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={otpChannel === "EMAIL" ? "user@example.com" : "+1 (555) 000-8888"}
                  />
                </div>

                {/* Security CAPTCHA */}
                <Captcha onValidate={handleCaptchaValidate} />

                <button
                  type="submit"
                  disabled={otpSending || !isCaptchaVerified || !mobileIdentifier.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {otpSending ? "Sending OTP Code..." : `Send ${otpChannel} Verification Code`}
                </button>
              </form>
            ) : (
              /* Verify OTP Form */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.trim().length < 4}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? "Verifying..." : "Verify OTP & Sign In"}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                      setError("");
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    ← Change Number / Resend
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-semibold">Or continue with</span>
          </div>
        </div>

        {/* Google Sign-In Option */}
        <div className="space-y-2">
          <button
            type="button"
            disabled
            title="Google Identity Services is not configured for this portal"
            className="w-full h-12 flex items-center justify-center gap-3 px-4 border rounded-xl font-bold text-sm whitespace-nowrap bg-slate-100 border-slate-200 text-slate-400 opacity-70 cursor-not-allowed"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#94A3B8"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#94A3B8"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#94A3B8"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#94A3B8"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              Google Sign-In setup required
            </span>
          </button>
          <p className="text-center text-[11px] text-slate-500">
            Use email or OTP for now. Google login will be enabled only after a real Google Identity Services client is configured.
          </p>
        </div>

        <div className="flex items-center justify-center text-xs pt-2 border-t border-slate-100">
          <Link
            href="/register"
            className="text-blue-600 font-bold hover:text-blue-700 hover:underline"
          >
            Don&apos;t have an account? Sign Up →
          </Link>
        </div>
      </div>
    </div>
  );
}
