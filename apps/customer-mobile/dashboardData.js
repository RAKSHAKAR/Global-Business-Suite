function readCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function parseCustomerDashboard(payload) {
  const source = payload?.data ?? payload;
  if (!source || source.source !== "TENANT_DATABASE" || typeof source.counts !== "object") return null;

  const data = {
    orders: readCount(source.counts.orders),
    upcomingAppointments: readCount(source.counts.upcomingAppointments),
    openTickets: readCount(source.counts.openTickets),
    documents: readCount(source.counts.documents),
    googleLocations: readCount(source.counts.googleLocations),
    reviews: readCount(source.counts.reviews),
    reviewAverage:
      typeof source.reviewAverage === "number" && Number.isFinite(source.reviewAverage)
        ? source.reviewAverage
        : null,
    subscriptionStatus:
      typeof source.subscription?.status === "string" ? source.subscription.status : null,
    planName: typeof source.subscription?.plan?.name === "string" ? source.subscription.plan.name : null,
  };

  return [
    data.orders,
    data.upcomingAppointments,
    data.openTickets,
    data.documents,
    data.googleLocations,
    data.reviews,
  ].every((value) => value !== null)
    ? data
    : null;
}

async function loadCustomerDashboard({ token, endpoint, fetchImpl = globalThis.fetch }) {
  if (!token || typeof fetchImpl !== "function") {
    return { ok: false, error: "A verified customer session is required to load dashboard data." };
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

    const data = parseCustomerDashboard(payload);
    return data
      ? { ok: true, data }
      : { ok: false, error: "The customer dashboard returned an incomplete data response." };
  } catch {
    return { ok: false, error: "Customer dashboard data is unavailable. Check the API connection and retry." };
  }
}

module.exports = { parseCustomerDashboard, loadCustomerDashboard };
