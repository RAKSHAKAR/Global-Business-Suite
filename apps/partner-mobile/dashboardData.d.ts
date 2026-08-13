export type PartnerDashboardData = {
  clients: number;
  socialPosts: number;
  pendingTasks: number;
  openTickets: number;
  locations: number;
  reviews: number;
  reviewAverage: number | null;
};

export function parsePartnerDashboard(payload: unknown): PartnerDashboardData | null;
export function loadPartnerDashboard(options: {
  token: string;
  endpoint: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; data: PartnerDashboardData } | { ok: false; error: string }>;
