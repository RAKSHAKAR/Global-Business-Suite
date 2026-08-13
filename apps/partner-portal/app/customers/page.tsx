"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";

const API = "http://127.0.0.1:4000";

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/v1/partner/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCustomers(data.customers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const handleCreate = async () => {
    if (!email || !firstName || !token) return;
    try {
      const res = await fetch(`${API}/api/v1/partner/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      if (res.ok) {
        const created = await res.json();
        setCustomers([created, ...customers]);
        setFirstName("");
        setLastName("");
        setEmail("");
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
            🤝 Customer & Lead CRM
          </h1>
          <p className="text-xs text-gray-400">Manage client contacts, lead prospects, tags, and activity timelines.</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="First Name *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="bg-[#242424] border border-[#333] px-3 py-2 rounded-xl text-xs text-white focus:outline-none flex-1 min-w-[140px]"
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="bg-[#242424] border border-[#333] px-3 py-2 rounded-xl text-xs text-white focus:outline-none flex-1 min-w-[140px]"
        />
        <input
          type="email"
          placeholder="Email Address *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-[#242424] border border-[#333] px-3 py-2 rounded-xl text-xs text-white focus:outline-none flex-1 min-w-[200px]"
        />
        <button
          onClick={handleCreate}
          className="bg-[#D4AF37] hover:bg-[#b8972e] text-black font-bold px-4 py-2 rounded-xl text-xs transition-all"
        >
          + Add Customer
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] shadow-md">
        <h2 className="text-base font-bold text-[#D4AF37] mb-4">Customer Directory ({customers.length})</h2>
        {loading ? (
          <p className="text-xs text-gray-400">Loading customers...</p>
        ) : (
          <div className="space-y-2">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[#242424] border border-[#333]">
                <div>
                  <p className="text-sm font-bold">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-gray-400">{c.email} • Status: {c.status}</p>
                </div>
                <span className="px-2 py-1 text-[10px] font-bold rounded-md bg-blue-500/20 text-blue-400">
                  {c.status || "ACTIVE"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
