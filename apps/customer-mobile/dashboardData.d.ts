export type CustomerDashboardData = {
  orders: number;
  upcomingAppointments: number;
  openTickets: number;
  documents: number;
  googleLocations: number;
  reviews: number;
  reviewAverage: number | null;
  subscriptionStatus: string | null;
  planName: string | null;
};

export function parseCustomerDashboard(payload: unknown): CustomerDashboardData | null;
export function loadCustomerDashboard(options: {
  token: string;
  endpoint: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; data: CustomerDashboardData } | { ok: false; error: string }>;
