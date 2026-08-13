"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../AuthContext";
import { Captcha } from "../../components/Captcha";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
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

    if (!captchaToken || !isCaptchaVerified) {
      setError("Please verify the Security CAPTCHA code first.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaId, captchaToken }),
      });

      const data = await res.json();
      const payload = data.data || data;
      if (res.ok && payload.token) {
        login(payload.token, payload.user);
      } else {
        setError(data.error || payload.message || "Login failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-5 sm:p-10 rounded-2xl shadow-xl border border-[#E5E0D8]">
        <div>
          <h2 className="mt-2 text-center text-3xl font-serif font-extrabold text-gray-900">
            Admin Portal
          </h2>
          <p className="mt-1 text-center text-xs text-gray-500 uppercase tracking-widest font-semibold">
            Enterprise Operations
          </p>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold text-center border border-red-200">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-sm"
                placeholder="admin@enterprise.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Captcha onValidate={handleCaptchaValidate} />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !isCaptchaVerified}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[#1A1A1A] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Authenticating..." : "Sign In to Admin Portal"}
            </button>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-1">
            <p className="text-xs text-amber-800 font-medium">
              🔒 Admin registration is restricted.
            </p>
            <p className="text-xs text-amber-800 font-medium">
              Accounts are created by system administrators only.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
