import { prisma } from "@saas/database";

export class ReportingServiceModule {
  public async getDashboardMetrics(tenantId: string) {
    const totalUsers = await prisma.user.count({ where: { tenantId } });

    return {
      tenantId,
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers,
        activeCampaigns: 4,
        totalLeads: 28,
        averageRating: 4.8,
        reviewsCount: 142,
        aiTokensUsed: 12500,
      },
    };
  }

  public async generateReportCSV(tenantId: string, type: string) {
    const metrics = await this.getDashboardMetrics(tenantId);
    const csvContent = `TenantID,Type,TotalUsers,TotalLeads,AverageRating\n${metrics.tenantId},${type},${metrics.summary.totalUsers},${metrics.summary.totalLeads},${metrics.summary.averageRating}`;
    return csvContent;
  }
}

export const reportingServiceModule = new ReportingServiceModule();
