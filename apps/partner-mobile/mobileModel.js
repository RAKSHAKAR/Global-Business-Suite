const PARTNER_TABS = Object.freeze([
  { id: "DASHBOARD", label: "📊 Dashboard" },
  { id: "ANALYTICS", label: "📈 Analytics BI" },
  { id: "GBP", label: "🏪 GBP Manager" },
  { id: "SOCIAL", label: "📢 Social Media" },
  { id: "CRM", label: "🤝 CRM & Leads" },
  { id: "TASKS", label: "📋 Tasks" },
  { id: "AI_ASSISTANT", label: "❆ AI Tools" },
  { id: "UNIFIED_INBOX", label: "📥 Unified Inbox" },
  { id: "CALL_CENTER", label: "📞 Call Center" },
  { id: "APPOINTMENTS", label: "📅 Appointments" },
  { id: "NOTIFICATIONS", label: "🔔 Alerts" },
  { id: "SEARCH", label: "🔍 Voice Search" },
  { id: "SETTINGS", label: "⚙️ Settings" },
]);

const BIOMETRIC_AUTH_AVAILABLE = false;
const BIOMETRIC_UNAVAILABLE_MESSAGE =
  "Biometric sign-in is not configured in this build. Sign in with your email and password.";

const PARTNER_PUBLIC_ROUTES = Object.freeze(["/login", "/register"]);

function resolveServiceUrl({ configuredUrl, platform, port, path = "" }) {
  const configuredBase = typeof configuredUrl === "string" ? configuredUrl.trim() : "";
  const localHost = platform === "android" ? "10.0.2.2" : "localhost";
  const baseUrl = (configuredBase || `http://${localHost}:${port}`).replace(/\/+$/, "");
  const normalizedPath = path ? `/${String(path).replace(/^\/+/, "")}` : "";
  return `${baseUrl}${normalizedPath}`;
}

function normalizeRoleName(value) {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "") : "";
}

function extractRoleNames(profile) {
  const roles = [];
  const addRole = (value) => { const normalized = normalizeRoleName(value); if (normalized && !roles.includes(normalized)) roles.push(normalized); };
  addRole(profile?.role);
  for (const entry of Array.isArray(profile?.roles) ? profile.roles : []) {
    if (typeof entry === "string") addRole(entry);
    else { addRole(entry?.name); addRole(entry?.role?.name); }
  }
  return roles;
}

async function verifyPortalAccess({ token, endpoint, expectedRoles, portalName, fetchImpl = globalThis.fetch }) {
  if (!token || typeof fetchImpl !== "function") return { ok: false, error: "Unable to verify this session." };
  try {
    const response = await fetchImpl(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    const profile = data?.data ?? data;
    if (!response.ok || !profile || typeof profile !== "object") return { ok: false, error: "Your session is no longer valid. Please sign in again." };
    if (profile.isSuspended === true || (profile.approvalStatus && profile.approvalStatus !== "APPROVED")) return { ok: false, error: "This account is not active." };
    const roles = extractRoleNames(profile);
    const allowedRoles = expectedRoles.map(normalizeRoleName);
    if (!roles.some((role) => allowedRoles.includes(role))) return { ok: false, error: `This account does not have access to ${portalName}.` };
    return { ok: true, user: profile, roles };
  } catch { return { ok: false, error: "Unable to verify portal access. Please try again." }; }
}

async function authenticateWithPassword({
  email,
  password,
  endpoint,
  fetchImpl = globalThis.fetch,
  headers = {},
}) {
  if (!email.trim() || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  if (typeof fetchImpl !== "function") {
    return { ok: false, error: "Authentication service is unavailable." };
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ email: email.trim(), password }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    const payload = data && typeof data === "object" && data.data ? data.data : data;
    if (!response.ok) {
      return {
        ok: false,
        error: data.error || payload?.message || "Invalid email or password.",
      };
    }

    if (typeof payload?.token !== "string" || !payload.token.trim()) {
      return {
        ok: false,
        error: "Authentication response did not include a valid session token.",
      };
    }

    return { ok: true, token: payload.token, user: payload.user ?? null };
  } catch {
    return {
      ok: false,
      error: "Unable to reach the authentication service. Please try again.",
    };
  }
}

module.exports = {
  PARTNER_TABS,
  BIOMETRIC_AUTH_AVAILABLE,
  BIOMETRIC_UNAVAILABLE_MESSAGE,
  PARTNER_PUBLIC_ROUTES,
  resolveServiceUrl,
  normalizeRoleName,
  extractRoleNames,
  verifyPortalAccess,
  authenticateWithPassword,
};
