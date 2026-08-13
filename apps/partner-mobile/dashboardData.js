function readCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function parsePartnerDashboard(payload) {
  const source = payload?.data ?? payload;
  if (!source || typeof source !== "object") return null;

  const data = {
    clients: readCount(source.customerCount),
    socialPosts: readCount(source.socialPostsCount),
    pendingTasks: readCount(source.pendingTasks),
    openTickets: readCount(source.openTicketsCount),
    locations: readCount(source.locationsCount),
    reviews: readCount(source.reviewsCount),
    reviewAverage:
      readCount(source.reviewsCount) > 0 && typeof source.avgRating === "number" && Number.isFinite(source.avgRating)
        ? source.avgRating
        : null,
  };

  return [data.clients, data.socialPosts, data.pendingTasks, data.openTickets, data.locations, data.reviews]
    .every((value) => value !== null)
    ? data
    : null;
}

async function loadPartnerDashboard({ token, endpoint, fetchImpl = globalThis.fetch }) {
  if (!token || typeof fetchImpl !== "function") {
    return { ok: false, error: "A verified partner session is required to load dashboard data." };
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

    const data = parsePartnerDashboard(payload);
    return data
      ? { ok: true, data }
      : { ok: false, error: "The partner dashboard returned an incomplete data response." };
  } catch {
    return { ok: false, error: "Partner dashboard data is unavailable. Check the API connection and retry." };
  }
}

module.exports = { parsePartnerDashboard, loadPartnerDashboard };
