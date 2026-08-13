"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { ChartBarIcon, ArrowTrendingUpIcon } from "@heroicons/react/24/solid";

export default function MarketingScore() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Marketing Score
          </h1>
          <p className="text-gray-500">
            Track and optimize your overall digital presence.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#8a2be2]/10 to-transparent"></div>
            <div className="relative z-10 text-center">
              <div className="text-[5rem] font-bold text-gray-900 leading-none">
                86
              </div>
              <div className="text-sm font-medium text-[#D4AF37] mt-2 flex items-center justify-center gap-1">
                <ArrowTrendingUpIcon className="w-4 h-4" />
                Excellent (+4% this month)
              </div>
            </div>
            <div className="mt-8 w-full max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden relative z-10">
              <div
                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B28F2A] rounded-full"
                style={{ width: "86%" }}
              ></div>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                label: "Google Search Optimization",
                score: 92,
                color: "from-[#00d4ff] to-[#007fff]",
              },
              {
                label: "Social Media Engagement",
                score: 78,
                color: "from-[#ff007f] to-[#ff0033]",
              },
              {
                label: "Customer Reviews",
                score: 96,
                color: "from-[#ffff00] to-[#ffaa00]",
              },
              {
                label: "Profile Completeness",
                score: 100,
                color: "from-[#00ff7f] to-[#00bfff]",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="glass p-6 rounded-2xl flex flex-col justify-between"
              >
                <div className="text-gray-600 font-medium">{metric.label}</div>
                <div className="mt-4">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {metric.score}
                    </span>
                    <span className="text-xs text-gray-500">/ 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${metric.color} rounded-full`}
                      style={{ width: `${metric.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Action Plan</h2>
          <ul className="space-y-4">
            <li className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-transparent hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                <ChartBarIcon className="w-5 h-5 text-[#ff007f]" />
              </div>
              <div>
                <h4 className="text-gray-900 font-medium">
                  Post more frequently on Instagram
                </h4>
                <p className="text-gray-500 text-sm mt-1">
                  Your social engagement score is trailing. Aim for 3 posts per
                  week to boost visibility.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-transparent hover:border-gray-700 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
                <ChartBarIcon className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <h4 className="text-gray-900 font-medium">
                  Add high-quality cover photos
                </h4>
                <p className="text-gray-500 text-sm mt-1">
                  Enhance your Google profile with recent photos of your
                  storefront.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
