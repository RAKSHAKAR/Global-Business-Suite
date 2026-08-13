const { loadPartnerDashboard, parsePartnerDashboard } = require("../dashboardData");

const payload = {
  customerCount: 8,
  socialPostsCount: 5,
  pendingTasks: 2,
  openTicketsCount: 1,
  locationsCount: 3,
  reviewsCount: 0,
  avgRating: 4.8,
  monthlyRevenue: 14500,
  growthRate: "+18.4%",
};

describe("Partner Mobile dashboard data", () => {
  it("keeps tenant-record counts and suppresses a fallback rating with no reviews", () => {
    expect(parsePartnerDashboard(payload)).toEqual({
      clients: 8,
      socialPosts: 5,
      pendingTasks: 2,
      openTickets: 1,
      locations: 3,
      reviews: 0,
      reviewAverage: null,
    });
    expect(parsePartnerDashboard(payload)).not.toHaveProperty("monthlyRevenue");
    expect(parsePartnerDashboard(payload)).not.toHaveProperty("growthRate");
  });

  it("uses a real average only when tenant reviews exist", () => {
    expect(parsePartnerDashboard({ ...payload, reviewsCount: 2, avgRating: 4.25 })?.reviewAverage).toBe(4.25);
  });

  it("loads with the verified bearer token and reports API errors", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });
    await expect(loadPartnerDashboard({ token: "partner-token", endpoint: "https://api.test/metrics", fetchImpl }))
      .resolves.toEqual({ ok: true, data: parsePartnerDashboard(payload) });
    expect(fetchImpl).toHaveBeenCalledWith("https://api.test/metrics", {
      headers: { Authorization: "Bearer partner-token" },
    });

    await expect(loadPartnerDashboard({
      token: "partner-token",
      endpoint: "https://api.test/metrics",
      fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    })).resolves.toEqual({ ok: false, error: "Dashboard request failed (503)." });
  });
});
