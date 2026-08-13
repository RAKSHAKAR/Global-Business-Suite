"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

type Tenant = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  themeSettingsJson: string | null;
};

type TenantContextType = {
  tenantId: string | null;
  tenant: Tenant | null;
  setTenantId: (id: string | null) => void;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export function TenantProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Customer portal: tenant scope is determined by the authenticated user's tenantId
    if (user?.tenantId) {
      setTenantId(user.tenantId);
    }
  }, [user]);

  useEffect(() => {
    if (!token || !tenantId) return;

    fetch(`${API_BASE}/api/v1/tenants/${tenantId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tenant");
        return res.json();
      })
      .then((data: Tenant) => {
        setTenant(data);
        // Apply tenant theme CSS variables if available
        if (data.primaryColor) {
          document.documentElement.style.setProperty("--tenant-primary", data.primaryColor);
        }
      })
      .catch((err) => console.error("[TenantContext]", err));
  }, [token, tenantId]);

  return (
    <TenantContext.Provider value={{ tenantId, tenant, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
