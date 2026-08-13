"use client";

import DashboardLayout from "@/components/DashboardLayout";
import {
  UserCircleIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

export default function Profile() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Profile Settings
          </h1>
          <p className="text-gray-500">
            Manage your business information and account details.
          </p>
        </div>

        <div className="glass p-8 rounded-3xl border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center border-b border-gray-200 pb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B28F2A] p-1">
              <div className="w-full h-full bg-gray-50 rounded-full flex items-center justify-center">
                <UserCircleIcon className="w-16 h-16 text-gray-500" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Alice Sharma</h2>
              <p className="text-[#D4AF37] font-medium">Enterprise Plan</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <EnvelopeIcon className="w-4 h-4" /> alice@gbs.com
                </span>
                <span className="flex items-center gap-1">
                  <PhoneIcon className="w-4 h-4" /> +91 98765 43210
                </span>
              </div>
            </div>
            <div className="sm:ml-auto">
              <button className="bg-gray-200 hover:bg-gray-700 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-700">
                Edit Profile
              </button>
            </div>
          </div>

          <div className="pt-8 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BuildingStorefrontIcon className="w-5 h-5 text-[#D4AF37]" />
              Business Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Business Name
                </label>
                <div className="text-gray-900 bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                  Sharma Electronics
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Category
                </label>
                <div className="text-gray-900 bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                  Consumer Electronics Retail
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Address
                </label>
                <div className="text-gray-900 bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                  123 Market Street, New Delhi, India 110001
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
