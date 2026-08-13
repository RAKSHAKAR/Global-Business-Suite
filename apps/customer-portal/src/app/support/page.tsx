"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { QuestionMarkCircleIcon, PlusIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  messages?: Array<{ id: string; content: string }>;
};

type KnowledgeArticle = {
  id: string;
  title: string;
  category: string;
};

type SupportData = {
  tickets: Ticket[];
  kbArticles: KnowledgeArticle[];
};

export default function SupportPage() {
  const { token } = useAuth();
  const [data, setData] = useState<SupportData>({ tickets: [], kbArticles: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const submittingRef = useRef(false);

  const loadSupport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const nextData = await apiRequest<SupportData>("/api/v1/customer/support", token);
      setData({ tickets: nextData.tickets || [], kbArticles: nextData.kbArticles || [] });
    } catch (reason) {
      setData({ tickets: [], kbArticles: [] });
      setLoadError(reason instanceof Error ? reason.message : "Support data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSupport();
  }, [loadSupport]);

  const handleCreateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || submittingRef.current) return;
    const normalizedSubject = subject.trim();
    const normalizedDescription = description.trim();
    if (!normalizedSubject || !normalizedDescription) {
      setActionError("Subject and description are required.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setActionError("");
    setNotice("");
    try {
      const ticket = await apiRequest<Ticket>("/api/v1/customer/support/tickets", token, {
        method: "POST",
        body: JSON.stringify({ subject: normalizedSubject, description: normalizedDescription, priority }),
      });
      setData((current) => ({ ...current, tickets: [ticket, ...current.tickets] }));
      setSubject("");
      setDescription("");
      setPriority("MEDIUM");
      setShowForm(false);
      setNotice(`Support ticket “${ticket.subject}” was created.`);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Support ticket could not be created.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <QuestionMarkCircleIcon className="h-7 w-7 text-sky-600" /> Customer Support Center
            </h1>
            <p className="text-sm text-gray-500">Track persisted support tickets and browse published knowledge articles.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            aria-expanded={showForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
          >
            <PlusIcon className="h-4 w-4" /> {showForm ? "Close Ticket Form" : "Open Support Ticket"}
          </button>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}
          {actionError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{actionError}</p> : null}
        </div>

        {showForm ? (
          <form onSubmit={handleCreateTicket} className="space-y-4 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-gray-900">New support ticket</h2>
            <div>
              <label htmlFor="ticket-subject" className="mb-1 block text-sm font-semibold text-gray-700">Subject</label>
              <input id="ticket-subject" value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={160} disabled={submitting} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label htmlFor="ticket-description" className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
              <textarea id="ticket-description" value={description} onChange={(event) => setDescription(event.target.value)} required rows={4} disabled={submitting} className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100" />
            </div>
            <div>
              <label htmlFor="ticket-priority" className="mb-1 block text-sm font-semibold text-gray-700">Priority</label>
              <select id="ticket-priority" value={priority} onChange={(event) => setPriority(event.target.value)} disabled={submitting} className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100">
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </select>
            </div>
            <button type="submit" disabled={submitting} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? "Creating Ticket..." : "Create Ticket"}
            </button>
          </form>
        ) : null}

        {loading ? (
          <LoadingState label="Loading support portal..." />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void loadSupport()} />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="space-y-4 lg:col-span-2" aria-labelledby="tickets-heading">
              <h2 id="tickets-heading" className="font-bold text-gray-900">Your support tickets</h2>
              {data.tickets.length ? (
                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm">
                  {data.tickets.map((ticket) => (
                    <article key={ticket.id} className="flex items-start justify-between gap-4 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{ticket.subject}</h3>
                        {ticket.messages?.[0]?.content ? <p className="mt-1 text-xs text-gray-500">{ticket.messages[0].content}</p> : null}
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">{ticket.status}</span>
                        <p className="mt-1 text-[10px] font-semibold text-gray-500">{ticket.priority}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No support tickets" description="No support tickets exist for this tenant." />
              )}
            </section>

            <section className="space-y-4" aria-labelledby="knowledge-heading">
              <h2 id="knowledge-heading" className="flex items-center gap-1 font-bold text-gray-900"><BookOpenIcon className="h-5 w-5 text-sky-600" /> Knowledge Base & FAQs</h2>
              {data.kbArticles.length ? (
                <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  {data.kbArticles.map((article) => (
                    <article key={article.id} className="rounded-xl bg-gray-50 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">{article.category}</span>
                      <h3 className="mt-1 text-xs font-medium text-gray-900">{article.title}</h3>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No published articles" description="No knowledge-base articles are currently published." />
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
