"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";

type Media = { id: string; mediaFormat: string; category: string; sourceUrl: string; thumbnailUrl: string | null; description: string | null; googleMediaId: string | null; createdAt: string };
type Location = { id: string; title: string | null; locationName: string | null; verificationStatus: string; lastSyncAt: string | null; gbpMedia: Media[] };

export default function GoogleMediaPage() {
  const { token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [connected, setConnected] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [mediaFormat, setMediaFormat] = useState<"PHOTO" | "VIDEO">("PHOTO");
  const [category, setCategory] = useState("ADDITIONAL");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const data = await apiRequest<{ connected: boolean; locations: Location[] }>("/api/v1/customer/google-media", token);
      setConnected(data.connected); setLocations(data.locations || []);
      setLocationId((current) => current || data.locations?.[0]?.id || "");
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Google media is unavailable."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const mediaItems = useMemo(() => locations.flatMap((location) => location.gbpMedia.map((media) => ({ ...media, locationName: location.title || location.locationName || "Unnamed location" }))), [locations]);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!token) return;
    setSubmitting(true); setError(""); setNotice("");
    try {
      await apiRequest("/api/v1/customer/google-media", token, { method: "POST", body: JSON.stringify({ locationId, sourceUrl, mediaFormat, category, description }) });
      setNotice("Media source saved to the GBS library. Google publication remains pending until a connected provider synchronizes it.");
      setSourceUrl(""); setDescription(""); await load();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Media could not be saved."); }
    finally { setSubmitting(false); }
  };

  const remove = async (media: Media) => {
    if (!token || media.googleMediaId || !window.confirm("Remove this local media item?")) return;
    setError("");
    try { await apiRequest(`/api/v1/customer/google-media/${media.id}`, token, { method: "DELETE" }); await load(); }
    catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Media could not be removed."); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header><h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><PhotoIcon className="h-7 w-7 text-blue-600" /> Google media</h1><p className="mt-1 text-sm text-gray-500">Manage photo and video sources for tenant-owned Google locations.</p></header>
        {loading ? <LoadingState label="Loading Google media..." /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading ? <>
          <div className={`rounded-xl border p-4 text-sm ${connected ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            {connected ? "Google Business is connected. Items with a Google media ID are synchronized." : "Google Business is not connected. New URLs are stored locally only and are not represented as published."}
          </div>
          {notice ? <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900" role="status">{notice}</div> : null}
          <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm font-semibold text-gray-700">Location<select required value={locationId} onChange={(e) => setLocationId(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"><option value="">Select</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.title || location.locationName || "Unnamed"}</option>)}</select></label>
            <label className="text-sm font-semibold text-gray-700 lg:col-span-2">HTTPS media URL<input required type="url" pattern="https://.*" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://cdn.example.com/photo.jpg" className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2" /></label>
            <label className="text-sm font-semibold text-gray-700">Format<select value={mediaFormat} onChange={(e) => setMediaFormat(e.target.value as typeof mediaFormat)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"><option>PHOTO</option><option>VIDEO</option></select></label>
            <label className="text-sm font-semibold text-gray-700">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2">{["ADDITIONAL", "LOGO", "COVER", "EXTERIOR", "INTERIOR", "PRODUCT", "AT_WORK", "FOOD_AND_DRINK", "MENU"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2 lg:col-span-4">Description<input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2" /></label>
            <button disabled={submitting || !locations.length} className="self-end rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? "Saving..." : "Add media source"}</button>
          </form>
          {mediaItems.length ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{mediaItems.map((media) => <article key={media.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div className="relative flex aspect-video items-center justify-center bg-gray-100">{media.mediaFormat === "PHOTO" ? <Image unoptimized fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" src={media.thumbnailUrl || media.sourceUrl} alt={media.description || `${media.category} media`} className="object-cover" /> : <PhotoIcon className="h-12 w-12 text-gray-400" />}</div><div className="p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold text-gray-900">{media.locationName}</p><p className="text-xs text-gray-500">{media.category} · {formatDate(media.createdAt)}</p></div><span className={`h-fit rounded-full px-2 py-1 text-[11px] font-semibold ${media.googleMediaId ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{media.googleMediaId ? "SYNCED" : "LOCAL ONLY"}</span></div>{media.description ? <p className="mt-3 text-sm text-gray-600">{media.description}</p> : null}<div className="mt-4 flex justify-between"><a href={media.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600">Open source</a><button type="button" onClick={() => void remove(media)} disabled={Boolean(media.googleMediaId)} aria-label={`Remove ${media.description || media.category}`} className="text-red-600 disabled:text-gray-300"><TrashIcon className="h-5 w-5" /></button></div></div></article>)}</section> : <EmptyState title="No media items" description={locations.length ? "Add an HTTPS media source to this tenant's local Google media library." : "Connect and synchronize a Google Business location before adding media."} />}
        </> : null}
      </div>
    </DashboardLayout>
  );
}
