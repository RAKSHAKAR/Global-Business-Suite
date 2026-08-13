const { loadCustomerDashboard, parseCustomerDashboard } = require("../dashboardData");

const payload = {
  source: "TENANT_DATABASE",
  subscription: { status: "ACTIVE", plan: { name: "Growth" } },
  counts: {
    orders: 5,
    upcomingAppointments: 2,
    openTickets: 1,
    documents: 3,
    googleLocations: 1,
    reviews: 4,
  },
  reviewAverage: 4.5,
};

describe("Customer Mobile dashboard data", () => {
  it("accepts only an explicitly tenant-database-backed summary", () => {
    expect(parseCustomerDashboard(payload)).toEqual({
      orders: 5,
      upcomingAppointments: 2,
      openTickets: 1,
      documents: 3,
      googleLocations: 1,
      reviews: 4,
      reviewAverage: 4.5,
      subscriptionStatus: "ACTIVE",
      planName: "Growth",
    });
    expect(parseCustomerDashboard({ ...payload, source: "DEMO" })).toBeNull();
  });

  it("loads with the verified bearer token", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload });
    await expect(loadCustomerDashboard({ token: "customer-token", endpoint: "https://api.test/summary", fetchImpl }))
      .resolves.toEqual({ ok: true, data: parseCustomerDashboard(payload) });
    expect(fetchImpl).toHaveBeenCalledWith("https://api.test/summary", {
      headers: { Authorization: "Bearer customer-token" },
    });
  });

  it("does not manufacture values when the response is incomplete", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ source: "TENANT_DATABASE", counts: { orders: 1 } }),
    });
    await expect(loadCustomerDashboard({ token: "customer-token", endpoint: "https://api.test/summary", fetchImpl }))
      .resolves.toEqual({ ok: false, error: "The customer dashboard returned an incomplete data response." });
  });
});
