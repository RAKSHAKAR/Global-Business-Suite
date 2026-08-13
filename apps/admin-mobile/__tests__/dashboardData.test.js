const { loadAdminDashboard, parseAdminDashboard } = require("../dashboardData");

const payload = {
  widgets: {
    activeUsers: { total: 12, active: 9 },
    subscriptionSummary: { active: 4 },
    socialMediaStatus: { totalPosts: 7 },
    googleBusinessStatus: { connectedLocations: 2, avgRating: 4.8 },
    revenueOverview: { monthlyRecurring: 48500 },
  },
};

describe("Admin Mobile dashboard data", () => {
  it("keeps only persisted-count fields and excludes fabricated operational values", () => {
    expect(parseAdminDashboard(payload)).toEqual({
      totalUsers: 12,
      activeUsers: 9,
      activeSubscriptions: 4,
      socialPosts: 7,
      googleLocations: 2,
    });
    expect(parseAdminDashboard(payload)).not.toHaveProperty("monthlyRecurring");
  });

  it("loads with the verified bearer token", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });

    await expect(loadAdminDashboard({ token: "admin-token", endpoint: "https://api.test/widgets", fetchImpl }))
      .resolves.toEqual({ ok: true, data: parseAdminDashboard(payload) });
    expect(fetchImpl).toHaveBeenCalledWith("https://api.test/widgets", {
      headers: { Authorization: "Bearer admin-token" },
    });
  });

  it("fails closed for incomplete and unavailable responses", async () => {
    expect(parseAdminDashboard({ widgets: { activeUsers: { total: 1 } } })).toBeNull();
    await expect(loadAdminDashboard({
      token: "admin-token",
      endpoint: "https://api.test/widgets",
      fetchImpl: jest.fn().mockRejectedValue(new Error("offline")),
    })).resolves.toEqual({
      ok: false,
      error: "Admin dashboard data is unavailable. Check the API connection and retry.",
    });
  });
});
