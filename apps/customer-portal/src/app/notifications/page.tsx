"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { BellIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

export default function NotificationsPage() {
  const { token } = useAuth();
  const [prefs, setPrefs] = useState<any>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ preferences: Record<string, boolean> }>("/api/v1/customer/notifications/preferences", token)
      .then((d) => setPrefs(d.preferences || {}));
  }, [token]);

  const handleToggle = (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);

    if (!token) return;
    apiRequest("/api/v1/customer/notifications/preferences", token, {
      method: "PUT",
      body: JSON.stringify(updated),
    }).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BellIcon className="w-7 h-7 text-rose-600" /> Notification Preferences
          </h1>
          <p className="text-sm text-gray-500">Configure delivery channels for order updates, appointment reminders, and billing alerts.</p>
        </div>

        {saved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1">
            <CheckIcon className="w-4 h-4" /> Preferences saved!
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Delivery Channels</h3>
            {[
              { id: "email", label: "Email Notifications" },
              { id: "sms", label: "SMS Text Messages" },
              { id: "whatsapp", label: "WhatsApp Direct Alerts" },
              { id: "push", label: "Mobile Push Notifications" },
              { id: "inApp", label: "In-App Drawer Badges" },
            ].map((ch) => (
              <label key={ch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                <span className="font-medium text-sm text-gray-900">{ch.label}</span>
                <input
                  type="checkbox"
                  checked={!!prefs[ch.id]}
                  onChange={() => handleToggle(ch.id)}
                  className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
                />
              </label>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Event Subscriptions</h3>
            {[
              { id: "orderUpdates", label: "Order & Shipping Updates" },
              { id: "appointmentReminders", label: "Upcoming Appointment Reminders" },
              { id: "invoiceAlerts", label: "Unpaid Invoice & Billing Alerts" },
              { id: "marketingPromos", label: "Exclusive Offers & Marketing Promos" },
            ].map((ev) => (
              <label key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                <span className="font-medium text-sm text-gray-900">{ev.label}</span>
                <input
                  type="checkbox"
                  checked={!!prefs[ev.id]}
                  onChange={() => handleToggle(ev.id)}
                  className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
