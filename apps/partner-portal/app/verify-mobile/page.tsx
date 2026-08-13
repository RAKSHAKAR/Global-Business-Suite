"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function PartnerVerifyMobilePage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      setError("Please enter your mobile phone number.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    setDevOtp("");

    try {
      const res = await fetch("http://localhost:4000/api/v1/iam/mobile-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Verification Mobile OTP code sent to your phone!");
        if (data.otp) setDevOtp(data.otp);
      } else {
        setError(data.error || "Failed to send Mobile OTP.");
      }
    } catch (err) {
      setError("Network error sending Mobile OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !code) {
      setError("Phone number and 6-digit Mobile OTP code are required.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://localhost:4000/api/v1/iam/mobile-otp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("🎉 Partner Mobile phone number verified successfully!");
      } else {
        setError(data.error || "Verification failed.");
      }
    } catch (err) {
      setError("Network error verifying Mobile OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-[#E5E0D8]">
        <div>
          <h2 className="text-center text-2xl font-serif font-bold text-gray-900">
            Verify Partner Mobile Phone
          </h2>
          <p className="mt-1 text-center text-xs text-gray-500">
            Enter your 6-digit SMS Mobile OTP code
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
            🔑 Dev Testing Mobile OTP: {devOtp}
          </div>
        )}

        <form onSubmit={handleConfirmOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Mobile Phone Number
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 555 019 2831"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="px-3 py-2 bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
              >
                Send SMS
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              6-Digit Mobile OTP
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
            {loading ? "Verifying..." : "Verify Mobile Phone"}
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
