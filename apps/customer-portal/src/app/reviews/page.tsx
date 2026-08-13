"use client";

import DashboardLayout from "@/components/DashboardLayout";
import {
  StarIcon,
  SparklesIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/solid";

export default function Reviews() {
  const reviews = [
    {
      id: 1,
      author: "Rahul Sharma",
      rating: 5,
      time: "2 days ago",
      text: "Excellent service and amazing ambiance! Highly recommend visiting this place.",
      replied: false,
    },
    {
      id: 2,
      author: "Sneha Patel",
      rating: 4,
      time: "1 week ago",
      text: "Good experience overall, but the waiting time was a bit long during peak hours.",
      replied: true,
    },
    {
      id: 3,
      author: "Amit Kumar",
      rating: 5,
      time: "2 weeks ago",
      text: "The quality is top-notch. Will definitely come back again.",
      replied: false,
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Customer Reviews
          </h1>
          <p className="text-gray-500">
            Manage your Google Reviews and let AI help you respond.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <h3 className="text-gray-500 text-sm font-medium mb-2">
              Average Rating
            </h3>
            <div className="text-5xl font-bold text-gray-900 mb-2">4.8</div>
            <div className="flex gap-1 text-yellow-400">
              {[1, 2, 3, 4].map((i) => (
                <StarIcon key={i} className="w-5 h-5" />
              ))}
              <div className="relative">
                <StarIcon className="w-5 h-5 text-gray-700" />
                <div className="absolute inset-0 overflow-hidden w-[80%]">
                  <StarIcon className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Based on 124 reviews</p>
          </div>
          <div className="md:col-span-2 glass p-6 rounded-2xl flex flex-col justify-center">
            <h3 className="text-gray-900 font-medium mb-4">
              Review Distribution
            </h3>
            <div className="space-y-2">
              {[
                { stars: 5, pct: 75, count: 93 },
                { stars: 4, pct: 15, count: 19 },
                { stars: 3, pct: 5, count: 6 },
                { stars: 2, pct: 3, count: 4 },
                { stars: 1, pct: 2, count: 2 },
              ].map((row) => (
                <div
                  key={row.stars}
                  className="flex items-center gap-3 text-sm"
                >
                  <div className="w-12 text-gray-500 flex items-center justify-end gap-1">
                    {row.stars} <StarIcon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${row.pct}%` }}
                    ></div>
                  </div>
                  <div className="w-8 text-right text-gray-500">
                    {row.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Reviews</h2>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="glass p-6 rounded-2xl border border-gray-200 flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-gray-900 font-medium">
                      {review.author}
                    </h3>
                    <p className="text-xs text-gray-500">{review.time}</p>
                  </div>
                  <div className="flex text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "" : "text-gray-700"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {review.text}
                </p>
              </div>

              <div className="w-full md:w-auto md:min-w-[200px] pt-4 border-t border-gray-200 md:border-t-0 md:pt-0 md:border-l md:pl-6 flex flex-col justify-center gap-3">
                {review.replied ? (
                  <div className="text-green-400 text-sm font-medium flex items-center justify-center gap-1 bg-green-400/10 py-2 px-4 rounded-lg">
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4" /> Replied
                  </div>
                ) : (
                  <button className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B28F2A] text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <SparklesIcon className="w-4 h-4" />
                    AI Reply
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
