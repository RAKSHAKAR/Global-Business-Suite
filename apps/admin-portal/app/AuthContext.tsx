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

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  compiledPermissions: string[];
  roles?: Array<{ role?: { name?: string }; name?: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
const ADMIN_ROLES = new Set(["super admin", "admin", "platform admin"]);

function hasAdminRole(user: User): boolean {
  return Boolean(user.roles?.some((entry) => ADMIN_ROLES.has((entry.role?.name || entry.name || "").toLowerCase())));
}

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`)
  );

  useEffect(() => {
    const storedToken = localStorage.getItem("saas_admin_token");
    if (storedToken && storedToken !== "undefined" && storedToken !== "null") {
      setToken(storedToken);
      void fetchUser(storedToken);
    } else {
      localStorage.removeItem("saas_admin_token");
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
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const userData = data.data || data;
        if (!hasAdminRole(userData)) {
          localStorage.removeItem("saas_admin_token");
          setToken(null);
          setUser(null);
          router.replace("/login?error=admin_access_required");
          return;
        }
        setUser(userData);
        if (redirectAfterLogin) router.push("/");
      } else {
        localStorage.removeItem("saas_admin_token");
        setToken(null);
        setUser(null);
        if (!isPublicRoute) {
          router.push("/login");
        }
      }
    } catch (e) {
      localStorage.removeItem("saas_admin_token");
      setToken(null);
      setUser(null);
      if (!isPublicRoute) {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string, _newUser: User) => {
    localStorage.setItem("saas_admin_token", newToken);
    setToken(newToken);
    setUser(null);
    setIsLoading(true);
    void fetchUser(newToken, true);
  };

  const logout = () => {
    localStorage.removeItem("saas_admin_token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const hasPermission = (resource: string, action: string) => {
    if (!user) return false;
    return user.compiledPermissions.includes(`${resource}:${action}`);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}
