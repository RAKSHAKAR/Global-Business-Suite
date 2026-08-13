export type LoginResult =
  | { ok: true; token: string; user: Record<string, unknown> | null }
  | { ok: false; error: string };

export const PARTNER_TABS: ReadonlyArray<{ id: string; label: string }>;
export const BIOMETRIC_AUTH_AVAILABLE: false;
export const BIOMETRIC_UNAVAILABLE_MESSAGE: string;
export const PARTNER_PUBLIC_ROUTES: ReadonlyArray<string>;

export function resolveServiceUrl(options: {
  configuredUrl?: string;
  platform: string;
  port: number;
  path?: string;
}): string;
export function normalizeRoleName(value: unknown): string;
export function extractRoleNames(profile: unknown): string[];
export function verifyPortalAccess(options: { token: string; endpoint: string; expectedRoles: readonly string[]; portalName: string; fetchImpl?: typeof fetch }): Promise<{ ok: true; user: Record<string, unknown>; roles: string[] } | { ok: false; error: string }>;

export function authenticateWithPassword(options: {
  email: string;
  password: string;
  endpoint: string;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
}): Promise<LoginResult>;
