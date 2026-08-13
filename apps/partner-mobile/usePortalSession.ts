import { useCallback, useEffect, useState } from "react";
import { verifyPortalAccess } from "./mobileModel";
import { mobileSessionStorage } from "./sessionStorage";

type PortalSessionOptions = {
  profileUrl: string;
  logoutUrl: string;
  expectedRoles: readonly string[];
  portalName: string;
};

export function usePortalSession({ profileUrl, logoutUrl, expectedRoles, portalName }: PortalSessionOptions) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);
  const [error, setError] = useState("");

  const validateToken = useCallback(
    (token: string) => verifyPortalAccess({ token, endpoint: profileUrl, expectedRoles, portalName }),
    [expectedRoles, portalName, profileUrl],
  );

  const revokeToken = useCallback(
    (token: string) => fetch(logoutUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ allDevices: false }),
    }).then(() => undefined).catch(() => undefined),
    [logoutUrl],
  );

  const establishSession = useCallback(async (token: string) => {
    const access = await validateToken(token);
    if (!access.ok) {
      await mobileSessionStorage.clear().catch(() => undefined);
      await revokeToken(token);
      setError(access.error);
      return false;
    }
    try {
      await mobileSessionStorage.write({ token, user: access.user, roles: access.roles });
    } catch {
      await mobileSessionStorage.clear().catch(() => undefined);
      await revokeToken(token);
      setError("Unable to save this session securely. Please try again.");
      return false;
    }
    setSessionToken(token);
    setIsLoggedIn(true);
    setError("");
    return true;
  }, [revokeToken, validateToken]);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const storedSession = await mobileSessionStorage.read();
        if (!storedSession) {
          await mobileSessionStorage.clear().catch(() => undefined);
          return;
        }
        const access = await validateToken(storedSession.token);
        if (!active) return;
        if (!access.ok) {
          await mobileSessionStorage.clear().catch(() => undefined);
          await revokeToken(storedSession.token);
          if (active) setError(access.error);
          return;
        }
        await mobileSessionStorage.write({ token: storedSession.token, user: access.user, roles: access.roles });
        if (!active) return;
        setSessionToken(storedSession.token);
        setIsLoggedIn(true);
      } catch {
        await mobileSessionStorage.clear().catch(() => undefined);
        if (active) setError("Your saved session could not be restored. Please sign in again.");
      } finally {
        if (active) setRestoringSession(false);
      }
    };
    void restoreSession();
    return () => { active = false; };
  }, [revokeToken, validateToken]);

  const logout = useCallback(async () => {
    const token = sessionToken;
    setSessionToken(null);
    setIsLoggedIn(false);
    setError("");
    try {
      await mobileSessionStorage.clear();
    } catch {
      setError("Local session cleanup failed. Close the app before signing in again.");
    }
    if (token) {
      await revokeToken(token);
    }
  }, [revokeToken, sessionToken]);

  return { isLoggedIn, sessionToken, restoringSession, error, setError, establishSession, logout };
}
