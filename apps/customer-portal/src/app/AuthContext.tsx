"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-mobile",
];

export type CustomerUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  tenantId: string | null;
  avatarUrl: string | null;
  compiledPermissions: string[];
  roles?: Array<{ role?: { name?: string }; name?: string }>;
};

const CUSTOMER_ROLES = new Set(["customer"]);

function hasCustomerRole(user: CustomerUser): boolean {
  return Boolean(user.roles?.some((entry) => CUSTOMER_ROLES.has((entry.role?.name || entry.name || "").toLowerCase())));
}

type AuthContextType = {
  user: CustomerUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: CustomerUser) => void;
  logout: () => void;
  hasPermission: (resource: string, action: string) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  hasPermission: () => false,
});

export const useAuth = () => useContext(AuthContext);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
const TOKEN_KEY = "gbs_customer_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  useEffect(() => {
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

    if (storedToken && storedToken !== "undefined" && storedToken !== "null") {
      setToken(storedToken);
      void fetchUser(storedToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setIsLoading(false);
      if (!isPublicRoute) {
        router.push("/login");
      }
    }
  }, [pathname]);

  const fetchUser = async (authToken: string, redirectAfterLogin = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const userData = data.data || data;
        if (!hasCustomerRole(userData)) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
          router.replace("/login?error=customer_access_required");
          return;
        }
        setUser(userData);
        if (redirectAfterLogin) router.push("/");
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        if (!isPublicRoute) {
          router.push("/login");
        }
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      if (!isPublicRoute) {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string, _newUser: CustomerUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(null);
    setIsLoading(true);
    void fetchUser(newToken, true);
  };

  const logout = () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const hasPermission = (resource: string, action: string) => {
    if (!user) return false;
    return (
      user.compiledPermissions?.includes(`${resource}:${action}`) ||
      user.compiledPermissions?.includes(`${resource}:manage`)
    );
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}
