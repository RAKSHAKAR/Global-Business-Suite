"use client";

import DashboardLayout from "@/components/DashboardLayout";
import {
  BellIcon,
  ShieldCheckIcon,
  Cog8ToothIcon,
} from "@heroicons/react/24/outline";

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Settings
          </h1>
          <p className="text-gray-500">
            Manage your portal preferences and configurations.
          </p>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <BellIcon className="w-5 h-5 text-[#D4AF37]" />
              Notifications
            </h2>
            <div className="space-y-4">
              {[
                {
                  title: "New Review Alerts",
                  desc: "Get notified when a customer leaves a new Google review.",
                },
                {
                  title: "Weekly Reports",
                  desc: "Receive a summary of your marketing score every Monday.",
                },
                {
                  title: "AI Poster Suggestions",
                  desc: "Get recommendations for upcoming holidays and events.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50"
                >
                  <div>
                    <h3 className="text-gray-900 font-medium">{item.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                  </div>
                  <div className="w-11 h-6 bg-[#8a2be2] rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <Cog8ToothIcon className="w-5 h-5 text-[#ff007f]" />
              AI Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                <div>
                  <h3 className="text-gray-900 font-medium">
                    Auto-Reply to 5-Star Reviews
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Let AI automatically thank customers for 5-star reviews.
                  </p>
                </div>
                <div className="w-11 h-6 bg-gray-700 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                <div>
                  <h3 className="text-gray-900 font-medium">
                    Auto-Schedule Posts
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Automatically schedule generated posters for optimal times.
                  </p>
                </div>
                <div className="w-11 h-6 bg-[#8a2be2] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
              <ShieldCheckIcon className="w-5 h-5 text-green-400" />
              Security
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 bg-gray-200 hover:bg-gray-700 text-gray-900 px-4 py-3 rounded-xl font-medium transition-colors border border-gray-700">
                Change Password
              </button>
              <button className="flex-1 bg-gray-200 hover:bg-gray-700 text-gray-900 px-4 py-3 rounded-xl font-medium transition-colors border border-gray-700">
                Two-Factor Authentication
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
