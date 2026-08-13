function readCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function parseAdminDashboard(payload) {
  const widgets = payload?.data?.widgets ?? payload?.widgets;
  if (!widgets || typeof widgets !== "object") return null;

  const data = {
    totalUsers: readCount(widgets.activeUsers?.total),
    activeUsers: readCount(widgets.activeUsers?.active),
    activeSubscriptions: readCount(widgets.subscriptionSummary?.active),
    socialPosts: readCount(widgets.socialMediaStatus?.totalPosts),
    googleLocations: readCount(widgets.googleBusinessStatus?.connectedLocations),
  };

  return Object.values(data).every((value) => value !== null) ? data : null;
}

async function loadAdminDashboard({ token, endpoint, fetchImpl = globalThis.fetch }) {
  if (!token || typeof fetchImpl !== "function") {
    return { ok: false, error: "A verified admin session is required to load dashboard data." };
  }

  try {
    const response = await fetchImpl(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: typeof payload?.error === "string" ? payload.error : `Dashboard request failed (${response.status}).`,
      };
    }

    const data = parseAdminDashboard(payload);
    return data
      ? { ok: true, data }
      : { ok: false, error: "The admin dashboard returned an incomplete data response." };
  } catch {
    return { ok: false, error: "Admin dashboard data is unavailable. Check the API connection and retry." };
  }
}

module.exports = { parseAdminDashboard, loadAdminDashboard };
