"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { PlusIcon, CalendarDaysIcon } from "@heroicons/react/24/solid";

export default function SocialCalendar() {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dates = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
              Social Calendar
            </h1>
            <p className="text-gray-500">
              Plan and schedule your upcoming social media posts.
            </p>
          </div>
          <button className="bg-gradient-to-r from-[#8a2be2] to-[#6600cc] hover:from-[#b266ff] hover:to-[#8a2be2] text-gray-900 px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Create Post
          </button>
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarDaysIcon className="w-5 h-5 text-[#D4AF37]" />
              November 2026
            </h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                &lt; Prev
              </button>
              <button className="px-3 py-1 text-sm text-gray-900 bg-gray-200 rounded-md">
                Today
              </button>
              <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Next &gt;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/30">
            {days.map((day) => (
              <div
                key={day}
                className="py-3 text-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[120px] bg-gray-50/10">
            {/* Empty slots for start of month */}
            <div className="border-r border-b border-gray-200/50 p-2"></div>
            <div className="border-r border-b border-gray-200/50 p-2"></div>

            {dates.map((date) => {
              const hasPost = date === 12 || date === 15 || date === 24;
              return (
                <div
                  key={date}
                  className={`border-r border-b border-gray-200/50 p-2 relative hover:bg-gray-100 transition-colors cursor-pointer ${date === 14 ? "bg-[#8a2be2]/10" : ""}`}
                >
                  <span
                    className={`text-sm font-medium ${date === 14 ? "text-gray-900 bg-[#8a2be2] w-6 h-6 rounded-full flex items-center justify-center" : "text-gray-500"}`}
                  >
                    {date}
                  </span>

                  {hasPost && (
                    <div className="absolute bottom-2 left-2 right-2 bg-gradient-to-r from-[#ff007f]/20 to-[#8a2be2]/20 border border-[#ff007f]/30 rounded p-1 text-[10px] text-gray-900 truncate">
                      Diwali Offer
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
