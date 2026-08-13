"use client";

import { useState } from "react";
import Link from "next/link";
import { Captcha } from "../../components/Captcha";

export default function PartnerRegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
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
      const res = await fetch("http://127.0.0.1:4000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          tenantName: tenantName || `${firstName}'s Agency`,
          role: "PARTNER",
          captchaId,
          captchaToken,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(
          data.data?.message ||
            "Partner Registration submitted successfully! Your application is pending Admin Approval."
        );
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
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-[#E5E0D8]">
        <div>
          <h2 className="text-center text-3xl font-serif font-bold text-gray-900">
            Partner Registration
          </h2>
          <p className="mt-1 text-center text-xs text-gray-500 uppercase tracking-widest font-semibold">
            Create Your Partner & Agency Account
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl text-center font-semibold">
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
              Sign In to Partner Portal →
            </Link>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Agency / Business Name
              </label>
              <input
                type="text"
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Apex Marketing Ltd"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Business Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@tenant.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <Captcha onValidate={handleCaptchaValidate} />
            </div>

            <button
              type="submit"
              disabled={loading || !isCaptchaVerified}
              className="w-full py-3 bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering Partner..." : "Register Partner Account"}
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-gray-600">
            Already have a Partner account?{" "}
            <Link
              href="/login"
              className="font-bold text-amber-700 hover:text-amber-800 hover:underline"
            >
              Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
