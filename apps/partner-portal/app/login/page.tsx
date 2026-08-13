"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../AuthContext";
import { Captcha } from "../../components/Captcha";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaPasscode, setMfaPasscode] = useState("");
  const [step, setStep] = useState<"LOGIN" | "MFA_CHALLENGE">("LOGIN");
  const [tempData, setTempData] = useState<{ token: string; user: any } | null>(
    null,
  );
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

    if (step === "LOGIN") {
      if (!captchaToken || !isCaptchaVerified) {
        setError("Please verify the Security CAPTCHA code first.");
        return;
      }

      setLoading(true);

      try {
        const res = await fetch("http://127.0.0.1:4000/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, captchaId, captchaToken }),
        });

        const data = await res.json();
        const payload = data.data || data;
        if (res.ok && payload.token && payload.user) {
          if (!payload.user.tenantId) {
            setError("This account does not belong to a partner tenant.");
            return;
          }
          if (payload.user.mfaEnabled) {
            setTempData(payload);
            setStep("MFA_CHALLENGE");
          } else {
            login(payload.token, payload.user);
          }
        } else {
          setError(data.error || payload.message || "Login failed");
        }
      } catch (err) {
        setError("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // MFA Challenge verification
      setLoading(true);
      try {
        const res = await fetch(
          "http://127.0.0.1:4000/api/v1/auth/mfa/validate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: tempData?.user.id,
              passcode: mfaPasscode,
            }),
          },
        );
        const data = await res.json();
        if (res.ok && tempData) {
          login(tempData.token, tempData.user);
        } else {
          setError(data.error || "Invalid 6-digit MFA Passcode");
        }
      } catch (err) {
        setError("MFA verification error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-[#E5E0D8]">
        <div>
          <h2 className="mt-2 text-center text-3xl font-serif font-extrabold text-gray-900">
            Partner Portal
          </h2>
          <p className="mt-1 text-center text-xs text-gray-600 uppercase tracking-widest font-semibold">
            {step === "LOGIN"
              ? "Business Management"
              : "🔒 2FA Verification Step"}
          </p>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold text-center border border-red-200">
              ⚠️ {error}
            </div>
          )}

          {step === "LOGIN" ? (
            <>
              <div className="space-y-4 rounded-md shadow-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent text-sm"
                    placeholder="partner@tenant.com"
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
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-600 text-center">
                Enter the 6-digit TOTP code from your Google Authenticator or
                Authy app.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  6-Digit Passcode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={mfaPasscode}
                  onChange={(e) => setMfaPasscode(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 text-center font-mono text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  placeholder="000000"
                />
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || (step === "LOGIN" && !isCaptchaVerified)}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[#1C1917] hover:bg-[#292524] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading
                ? "Processing..."
                : step === "LOGIN"
                  ? "Sign In to Partner Portal"
                  : "Verify MFA Code"}
            </button>
          </div>

          {step === "LOGIN" && (
            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-600">
                Don&apos;t have a Partner account?{" "}
                <Link
                  href="/register"
                  className="font-bold text-amber-700 hover:text-amber-800 hover:underline"
                >
                  Register Partner Account →
                </Link>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
