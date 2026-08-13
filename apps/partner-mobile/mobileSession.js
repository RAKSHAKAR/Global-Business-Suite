const SESSION_STORAGE_KEY = "gbs.mobile.session.v1";

function sanitizeUser(user) {
  if (!user || typeof user !== "object") return null;
  const safeUser = {};
  for (const key of ["id", "email", "firstName", "lastName", "tenantId"]) {
    if (typeof user[key] === "string" || user[key] === null) safeUser[key] = user[key];
  }
  return safeUser;
}

function serializeSession(session) {
  return JSON.stringify({ version: 1, token: session.token, user: sanitizeUser(session.user), roles: Array.isArray(session.roles) ? session.roles.filter((role) => typeof role === "string") : [], savedAt: Date.now() });
}

function parseSession(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed?.version !== 1 || typeof parsed.token !== "string" || !parsed.token.trim()) return null;
    if (!Array.isArray(parsed.roles) || !parsed.roles.every((role) => typeof role === "string")) return null;
    return { token: parsed.token, user: sanitizeUser(parsed.user), roles: parsed.roles };
  } catch { return null; }
}

function createSessionStorage(storage) {
  return {
    async read() { return parseSession(await storage.getItem(SESSION_STORAGE_KEY)); },
    async write(session) { await storage.setItem(SESSION_STORAGE_KEY, serializeSession(session)); },
    async clear() { await storage.removeItem(SESSION_STORAGE_KEY); },
  };
}

module.exports = { SESSION_STORAGE_KEY, sanitizeUser, serializeSession, parseSession, createSessionStorage };
