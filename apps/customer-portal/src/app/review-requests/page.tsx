"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PaperAirplaneIcon, StarIcon } from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";

type Location = { id: string; title?: string | null; locationName?: string | null };
type RequestLog = {
  id: string;
  channel?: string;
  recipient?: string;
  customerName?: string;
  locationName?: string;
  status: string;
  createdAt: string;
};

export default function ReviewRequestsPage() {
  const { token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [deliveryConfigured, setDeliveryConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [locationId, setLocationId] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "SMS" | "WHATSAPP">("EMAIL");
  const [customerName, setCustomerName] = useState("");
  const [destination, setDestination] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [locationPayload, requestPayload] = await Promise.all([
        apiRequest<{ data: Location[] }>("/api/v1/gbp/locations", token),
        apiRequest<{ requests: RequestLog[]; deliveryConfigured: boolean }>("/api/v1/reviews/requests", token),
      ]);
      setLocations(locationPayload.data || []);
      setLocationId((current) => current || locationPayload.data?.[0]?.id || "");
      setRequests(requestPayload.requests || []);
      setDeliveryConfigured(requestPayload.deliveryConfigured);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Review request data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/v1/reviews/requests", token, {
        method: "POST",
        body: JSON.stringify({
          locationId,
          channel,
          customerName,
          ...(channel === "EMAIL" ? { customerEmail: destination } : { customerPhone: destination }),
        }),
      });
      setNotice("The configured provider accepted the review request.");
      setCustomerName("");
      setDestination("");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The review request could not be delivered.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><StarIcon className="h-7 w-7 text-amber-500" /> Review requests</h1>
          <p className="mt-1 text-sm text-gray-500">Send a manual invitation through your configured delivery provider and review its accepted-delivery log.</p>
        </header>

        {loading ? <LoadingState label="Loading review request settings..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="font-bold text-gray-900">Send manual request</h2>
                <p className="mt-1 text-xs text-gray-500">No request is reported as sent unless the external provider accepts it.</p>
              </div>

              {!deliveryConfigured ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Delivery is not configured. An administrator must set the review-request webhook URL and provider token.
                </div>
              ) : null}
              {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{notice}</div> : null}

              <label className="block text-sm font-semibold text-gray-700">Google location
                <select required value={locationId} onChange={(event) => setLocationId(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900">
                  <option value="">Select a location</option>
                  {locations.map((location) => <option key={location.id} value={location.id}>{location.title || location.locationName || "Unnamed location"}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700">Customer name
                <input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900" />
              </label>
              <label className="block text-sm font-semibold text-gray-700">Delivery channel
                <select value={channel} onChange={(event) => { setChannel(event.target.value as typeof channel); setDestination(""); }} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900">
                  <option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-gray-700">{channel === "EMAIL" ? "Email address" : "Phone number"}
                <input required type={channel === "EMAIL" ? "email" : "tel"} value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900" />
              </label>
              <button disabled={submitting || !deliveryConfigured || !locations.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                <PaperAirplaneIcon className="h-5 w-5" /> {submitting ? "Sending..." : "Send request"}
              </button>
            </form>

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-4"><h2 className="font-bold text-gray-900">Accepted delivery log</h2></div>
              {requests.length ? (
                <div className="divide-y divide-gray-100">
                  {requests.map((request) => (
                    <article key={request.id} className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center">
                      <div><p className="font-semibold text-gray-900">{request.customerName || "Customer"}</p><p className="text-sm text-gray-500">{request.locationName || "Google location"} · {request.channel || "Provider"} · {request.recipient || "masked"}</p></div>
                      <div className="text-left sm:text-right"><p className="text-xs font-semibold text-emerald-700">{request.status}</p><p className="text-xs text-gray-500">{formatDate(request.createdAt)}</p></div>
                    </article>
                  ))}
                </div>
              ) : <div className="p-5"><EmptyState title="No accepted deliveries" description="Successful provider acknowledgements will be recorded here." /></div>}
            </section>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
