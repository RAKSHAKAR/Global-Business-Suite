"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

export default function CalendarTasksPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<"EVENT" | "TASK">("EVENT");
  const [priority, setPriority] = useState("MEDIUM");

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/partner/calendar-tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setTasks(data.tasks || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async () => {
    if (!title || !token) return;
    try {
      if (itemType === "EVENT") {
        const res = await fetch(`${API}/api/v1/partner/calendar-tasks/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            startTime: new Date(),
            endTime: new Date(Date.now() + 3600000),
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setEvents([...events, created]);
          setTitle("");
        }
      } else {
        const res = await fetch(`${API}/api/v1/partner/calendar-tasks/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, priority }),
        });
        if (res.ok) {
          const created = await res.json();
          setTasks([created, ...tasks]);
          setTitle("");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full space-y-6 p-6 bg-[#121212] min-h-screen text-white">
      <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            📅 Calendar & Team Task Board
          </h1>
          <p className="text-xs text-gray-400">Events, meetings, appointments, reminders, and team tasks.</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex flex-wrap items-center gap-3">
        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value as any)}
          className="bg-[#242424] border border-[#333] px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
        >
          <option value="EVENT">Calendar Event</option>
          <option value="TASK">Task Item</option>
        </select>
        <input
          type="text"
          placeholder="Title (e.g. Client Strategy Call or Update GBP Photos)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[#242424] border border-[#333] px-3 py-2 rounded-xl text-xs text-white focus:outline-none flex-1 min-w-[220px]"
        />
        {itemType === "TASK" && (
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-[#242424] border border-[#333] px-3 py-2 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="LOW">Low Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="HIGH">High Priority</option>
          </select>
        )}
        <button
          onClick={handleCreate}
          className="bg-[#D4AF37] hover:bg-[#b8972e] text-black font-bold px-4 py-2 rounded-xl text-xs transition-all"
        >
          + Add {itemType === "EVENT" ? "Event" : "Task"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Events */}
        <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4">
          <h2 className="text-base font-bold text-[#D4AF37]">Upcoming Events & Appointments</h2>
          {loading ? (
            <p className="text-xs text-gray-400">Loading events...</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl bg-[#242424] border border-[#333] flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">{ev.title}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(ev.startTime).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-purple-500/20 text-purple-400">
                    EVENT
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Board */}
        <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] space-y-4">
          <h2 className="text-base font-bold text-[#D4AF37]">Team Tasks & Reminders</h2>
          {loading ? (
            <p className="text-xs text-gray-400">Loading tasks...</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-[#242424] border border-[#333] flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">{t.title}</p>
                    <p className="text-xs text-gray-400">Priority: {t.priority} • Status: {t.status}</p>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-400">
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
