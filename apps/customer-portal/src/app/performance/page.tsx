"use client";

import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  MapPinIcon,
} from "@heroicons/react/24/solid";

export default function GooglePerformance() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Google Performance
          </h1>
          <p className="text-gray-500">
            How customers are finding your business on Google.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:bg-[#00d4ff]/40 transition-all"></div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">
              Total Profile Views
            </h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-gray-900">4,289</span>
              <span className="text-[#D4AF37] text-sm font-medium pb-1 flex items-center">
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> +12%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-4">Last 30 days</p>
          </div>

          <div className="glass p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-2xl group-hover:bg-[#8a2be2]/40 transition-all"></div>
            <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1">
              <GlobeAltIcon className="w-4 h-4" /> Google Search
            </h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-gray-900">2,104</span>
              <span className="text-green-400 text-sm font-medium pb-1 flex items-center">
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> +5%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Searches showing your profile
            </p>
          </div>

          <div className="glass p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/40 transition-all"></div>
            <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1">
              <MapPinIcon className="w-4 h-4" /> Google Maps
            </h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-gray-900">2,185</span>
              <span className="text-green-400 text-sm font-medium pb-1 flex items-center">
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> +18%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Map views of your business
            </p>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Views Overview</h2>
            <select className="bg-gray-50 border border-gray-700 text-gray-600 text-sm rounded-lg px-3 py-1.5 focus:ring-[#8a2be2] focus:border-[#8a2be2]">
              <option>Last 30 Days</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
          </div>
          <div className="h-80 flex items-center justify-center border border-dashed border-gray-700 rounded-xl bg-gray-50/50 relative">
            {/* Mock Chart representation */}
            <div className="absolute bottom-0 left-0 w-full h-full flex items-end justify-between px-4 pb-8 pt-4 gap-2">
              {[40, 55, 45, 60, 80, 65, 90, 75, 85, 100, 85, 95].map((h, i) => (
                <div
                  key={i}
                  className="w-full bg-gradient-to-t from-[#8a2be2]/80 to-[#00d4ff]/80 rounded-t-sm transition-all duration-500 hover:from-[#8a2be2] hover:to-[#00d4ff]"
                  style={{ height: `${h}%` }}
                ></div>
              ))}
            </div>
            <div className="absolute bottom-2 left-0 w-full flex justify-between px-4 text-xs text-gray-500">
              <span>Oct 1</span>
              <span>Oct 15</span>
              <span>Oct 31</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
