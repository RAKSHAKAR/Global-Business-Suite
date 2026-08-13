"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { FolderIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDate } from "@/lib/format";

type CustomerDocument = {
  id: string;
  name: string;
  docType: string;
  fileUrl: string;
  fileSize: number;
  sharedBy: string | null;
  status?: string | null;
  createdAt?: string | null;
};

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export default function DocumentsPage() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const savingRef = useRef(false);

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiRequest<{ documents: CustomerDocument[] }>("/api/v1/customer/documents", token);
      setDocuments(data.documents || []);
    } catch (reason) {
      setDocuments([]);
      setLoadError(reason instanceof Error ? reason.message : "Documents could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const saveDocumentLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || savingRef.current) return;
    const normalizedName = name.trim();
    const normalizedUrl = fileUrl.trim();
    if (!normalizedName || !isHttpsUrl(normalizedUrl)) {
      setActionError("Enter a document name and a valid HTTPS file URL.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setActionError("");
    setNotice("");
    try {
      const document = await apiRequest<CustomerDocument>("/api/v1/customer/documents/upload", token, {
        method: "POST",
        body: JSON.stringify({ name: normalizedName, docType: "USER_UPLOAD", fileUrl: normalizedUrl }),
      });
      setDocuments((current) => [document, ...current]);
      setName("");
      setFileUrl("");
      setShowForm(false);
      setNotice(`Document link “${document.name}” was saved.`);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The document link could not be saved.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900"><FolderIcon className="h-7 w-7 text-amber-600" /> Document Vault</h1>
            <p className="text-sm text-gray-500">Access persisted document links associated with your account.</p>
            <p role="note" className="mt-2 text-xs text-amber-700">Binary upload and customer-document digital signing are not configured. Saving a link stores HTTPS metadata only.</p>
          </div>
          <button type="button" onClick={() => setShowForm((current) => !current)} aria-expanded={showForm} className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700">
            <ArrowUpTrayIcon className="h-4 w-4" /> {showForm ? "Close Link Form" : "Save Document Link"}
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}
          {actionError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{actionError}</p> : null}
        </div>

        {showForm ? (
          <form onSubmit={saveDocumentLink} className="space-y-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-gray-900">Save HTTPS document metadata</h2>
            <div>
              <label htmlFor="document-name" className="mb-1 block text-sm font-semibold text-gray-700">Document name</label>
              <input id="document-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} disabled={saving} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label htmlFor="document-url" className="mb-1 block text-sm font-semibold text-gray-700">HTTPS file URL</label>
              <input id="document-url" type="url" inputMode="url" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} required placeholder="https://..." disabled={saving} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100" />
            </div>
            <button type="submit" disabled={saving} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving Link..." : "Save Document Link"}</button>
          </form>
        ) : null}

        {loading ? (
          <LoadingState label="Loading document vault..." />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void loadDocuments()} />
        ) : documents.length ? (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Stored documents">
            {documents.map((document) => {
              const canOpen = isHttpsUrl(document.fileUrl);
              return (
                <article key={document.id} className="flex flex-col justify-between space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">{document.docType}</span>
                      <span className="text-[10px] font-semibold text-gray-500">{document.status || "Signature status unavailable"}</span>
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-sm font-bold text-gray-900">{document.name}</h2>
                    <p className="mt-1 text-xs text-gray-400">Shared by: {document.sharedBy || "Not recorded"} · {typeof document.fileSize === "number" && document.fileSize > 0 ? `${(document.fileSize / 1024).toFixed(1)} KB` : "Size unavailable"}</p>
                    {document.createdAt ? <p className="mt-1 text-xs text-gray-400">Stored {formatDate(document.createdAt)}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <button type="button" disabled title="Customer-document digital signing is not configured." className="w-full cursor-not-allowed rounded-lg bg-gray-100 py-2 text-xs font-semibold text-gray-400">Digital signing unavailable</button>
                    {canOpen ? (
                      <a href={document.fileUrl} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-1 rounded-lg bg-gray-50 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"><ArrowDownTrayIcon className="h-4 w-4" /> Open Stored File</a>
                    ) : (
                      <button type="button" disabled className="w-full cursor-not-allowed rounded-lg bg-gray-100 py-2 text-xs font-semibold text-gray-400">File URL unavailable</button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <EmptyState title="No documents" description="No document metadata records exist for this account." />
        )}
      </div>
    </DashboardLayout>
  );
}
