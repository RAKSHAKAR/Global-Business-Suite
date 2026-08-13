"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

type Tenant = {
  id: string;
  name: string;
};

type TenantContextType = {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
  tenants: Tenant[];
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("http://127.0.0.1:4000/api/tenants", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tenants");
        return res.json();
      })
      .then((data: Tenant[]) => {
        setTenants(data);
        if (data.length > 0 && !tenantId) {
          setTenantId(data[0].id);
        }
      })
      .catch((err) => console.error("Failed to load tenants", err));
  }, [token]);

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId, tenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
