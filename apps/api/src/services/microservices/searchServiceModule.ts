import { prisma } from "@saas/database";

export interface SearchOptions {
  tenantId: string;
  query: string;
  type?: "all" | "users" | "leads" | "reviews" | "posts";
  limit?: number;
  page?: number;
}

export class SearchServiceModule {
  public async globalSearch(options: SearchOptions) {
    const { tenantId, query, type = "all", limit = 20, page = 1 } = options;
    const skip = (page - 1) * limit;

    const results: Array<{ id: string; type: string; title: string; subtitle?: string; metadata?: any }> = [];

    if (type === "all" || type === "users") {
      const users = await prisma.user.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { email: { contains: query } },
          ],
        },
        include: { roles: { include: { role: true } } },
        take: limit,
      });

      users.forEach((u) => {
        const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
        results.push({
          id: u.id,
          type: "USER",
          title: fullName,
          subtitle: u.email,
          metadata: { role: u.roles?.[0]?.role?.name || "USER" },
        });
      });
    }

    if (type === "all" || type === "reviews") {
      const reviews = await prisma.review.findMany({
        where: {
          location: { tenantId },
          OR: [
            { comment: { contains: query } },
            { reviewerName: { contains: query } },
          ],
        },
        take: limit,
      });

      reviews.forEach((r: any) => {
        results.push({
          id: r.id,
          type: "REVIEW",
          title: `${r.reviewerName || "Anonymous"} (${r.starRating || 5} Stars)`,
          subtitle: r.comment?.substring(0, 80),
          metadata: { rating: r.starRating },
        });
      });
    }

    const total = results.length;
    const paginatedResults = results.slice(skip, skip + limit);

    return {
      query,
      results: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const searchServiceModule = new SearchServiceModule();
