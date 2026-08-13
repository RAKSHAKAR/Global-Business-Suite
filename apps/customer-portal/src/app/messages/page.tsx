"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/AsyncState";
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../AuthContext";
import { apiRequest } from "@/lib/api";

type CustomerMessage = {
  id: string;
  sender: string;
  senderName?: string | null;
  channel: string;
  content: string;
  timestamp: string;
};

function formatMessageTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const loadMessages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiRequest<{ messages: CustomerMessage[] }>("/api/v1/customer/messages", token);
      setMessages(data.messages || []);
    } catch (reason) {
      setMessages([]);
      setLoadError(reason instanceof Error ? reason.message : "Messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || sendingRef.current) return;

    const content = inputText.trim();
    if (!content) {
      setActionError("Enter a message before sending.");
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setActionError("");
    setNotice("");
    try {
      const message = await apiRequest<CustomerMessage>("/api/v1/customer/messages", token, {
        method: "POST",
        body: JSON.stringify({ content, channel: "LIVE_CHAT" }),
      });
      setMessages((current) => [...current, message]);
      setInputText("");
      setNotice("Message sent through live chat.");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Message could not be sent.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ChatBubbleLeftRightIcon className="h-7 w-7 text-emerald-600" /> Live Chat
          </h1>
          <p className="text-sm text-gray-500">View and send persisted messages through the authenticated live-chat channel.</p>
          <p role="note" className="mt-2 text-xs text-amber-700">Email, SMS, WhatsApp, and push delivery require provider adapters and are not configured here.</p>
        </div>

        <div aria-live="polite" aria-atomic="true">
          {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}
          {actionError ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{actionError}</p> : null}
        </div>

        {loading ? (
          <LoadingState label="Loading live-chat messages..." />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void loadMessages()} />
        ) : (
          <section className="flex h-[500px] flex-col rounded-2xl border border-gray-100 bg-white shadow-sm" aria-label="Live-chat conversation">
            <div className="flex-1 space-y-4 overflow-y-auto p-6" aria-live="polite">
              {messages.length ? messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${message.sender === "CUSTOMER" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md rounded-2xl p-4 text-sm ${
                      message.sender === "CUSTOMER"
                        ? "rounded-br-none bg-emerald-600 text-white"
                        : "rounded-bl-none bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p>{message.content}</p>
                    <span className="mt-1 block text-right text-[10px] opacity-75">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                </article>
              )) : (
                <EmptyState title="No live-chat messages" description="No persisted messages exist for this customer conversation." />
              )}
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-100 p-4">
              <label htmlFor="live-chat-message" className="sr-only">Live-chat message</label>
              <input
                id="live-chat-message"
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder="Type your message to support..."
                maxLength={4000}
                disabled={sending}
                aria-describedby="live-chat-channel-note"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-4 w-4" /> {sending ? "Sending..." : "Send"}
              </button>
            </form>
            <p id="live-chat-channel-note" className="sr-only">Messages are sent only through the persisted live-chat channel.</p>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
