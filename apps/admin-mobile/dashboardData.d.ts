export type AdminDashboardData = {
  totalUsers: number;
  activeUsers: number;
  activeSubscriptions: number;
  socialPosts: number;
  googleLocations: number;
};

export function parseAdminDashboard(payload: unknown): AdminDashboardData | null;
export function loadAdminDashboard(options: {
  token: string;
  endpoint: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; data: AdminDashboardData } | { ok: false; error: string }>;
