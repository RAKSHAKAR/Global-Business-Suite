"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { ChatBubbleLeftRightIcon, StarIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

export default function CustomerFeedbackPage() {
  const { token } = useAuth();
  const [type, setType] = useState("NPS");
  const [rating, setRating] = useState(9);
  const [comments, setComments] = useState("");
  const [category, setCategory] = useState("PRODUCT");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await apiRequest("/api/v1/crm/customer-success/feedback", token, {
        method: "POST",
        body: JSON.stringify({ type, rating, comments, category }),
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-7 h-7 text-amber-600" /> Customer Satisfaction & Feedback
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            We value your feedback! Rate your experience to help us improve your onboarding and product experience.
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <h3 className="font-bold text-emerald-900 text-lg">Thank You for Your Feedback!</h3>
            <p className="text-sm text-emerald-700">Your response has been registered with your Account Success Manager.</p>
            <button
              onClick={() => { setSubmitted(false); setComments(""); }}
              className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
            >
              Submit Additional Feedback
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase">Feedback Survey Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              >
                <option value="NPS">Net Promoter Score (NPS 1-10)</option>
                <option value="CSAT">Customer Satisfaction (CSAT 1-5)</option>
                <option value="GENERAL">General Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase">Rating ({rating} / {type === "CSAT" ? 5 : 10})</label>
              <input
                type="range"
                min="1"
                max={type === "CSAT" ? 5 : 10}
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="w-full mt-2 accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-bold px-1">
                <span>1 - Poor</span>
                <span>{type === "CSAT" ? "5 - Excellent" : "10 - Highly Recommend"}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
              >
                <option value="PRODUCT">Product & Platform Features</option>
                <option value="SUPPORT">Customer Support Experience</option>
                <option value="ONBOARDING">Onboarding & Training</option>
                <option value="BILLING">Billing & Invoicing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase">Your Comments & Suggestions</label>
              <textarea
                placeholder="What can we do to improve your experience?"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="w-full border rounded-xl p-2.5 text-sm mt-1"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
            >
              Submit Response
            </button>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
