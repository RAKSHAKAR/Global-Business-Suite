import { prisma } from "@saas/database";
import { randomBytes } from "node:crypto";

export class PartnerPortalServiceError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly code: string) {
    super(message);
    this.name = "PartnerPortalServiceError";
  }
}

export class PartnerPortalService {
  static async ensureTenant(tenantId: string) {
    try {
      const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!existing) {
        await prisma.tenant.create({
          data: {
            id: tenantId,
            name: "Demo Partner Tenant",
            domain: `demo-${tenantId}.gbs.com`,
          },
        });
      }
    } catch (e) {
      console.error("ensureTenant error:", e);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Dashboard Layout & Metrics
  // ---------------------------------------------------------------------------
  static async getDashboardLayout(userId: string) {
    const layout = await prisma.dashboardLayout.findUnique({
      where: { userId },
    });
    if (!layout) {
      // Default 16 widget layout order
      const defaultWidgets = [
        { id: "business_overview", visible: true, order: 1 },
        { id: "gbp_overview", visible: true, order: 2 },
        { id: "social_overview", visible: true, order: 3 },
        { id: "reviews_widget", visible: true, order: 4 },
        { id: "ai_usage", visible: true, order: 5 },
        { id: "leads_widget", visible: true, order: 6 },
        { id: "customers_widget", visible: true, order: 7 },
        { id: "tasks_widget", visible: true, order: 8 },
        { id: "calendar_widget", visible: true, order: 9 },
        { id: "revenue_widget", visible: true, order: 10 },
        { id: "subscription_widget", visible: true, order: 11 },
        { id: "notifications_widget", visible: true, order: 12 },
        { id: "campaigns_widget", visible: true, order: 13 },
        { id: "metrics_widget", visible: true, order: 14 },
        { id: "reports_widget", visible: true, order: 15 },
        { id: "pending_approvals", visible: true, order: 16 },
      ];
      return { userId, layoutJson: JSON.stringify(defaultWidgets) };
    }
    return layout;
  }

  static async saveDashboardLayout(userId: string, layoutJson: string) {
    return prisma.dashboardLayout.upsert({
      where: { userId },
      update: { layoutJson },
      create: { userId, layoutJson },
    });
  }

  static async getDashboardMetrics(tenantId: string) {
    if (!tenantId) {
      throw new Error("Authenticated tenant context is required");
    }
    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const activityStart = new Date(now);
    activityStart.setUTCHours(0, 0, 0, 0);
    activityStart.setUTCDate(activityStart.getUTCDate() - 6);

    const [
      tenant,
      totalCustomers,
      activeCustomers,
      totalSocialPosts,
      publishedSocialPosts,
      aiContentsCount,
      locationsCount,
      activeChannelPlatforms,
      reviewSummary,
      pendingTasks,
      campaignsCount,
      openTicketsCount,
      currentRevenue,
      previousRevenue,
      subscription,
      recentPosts,
      recentLeads,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, isActive: true, createdAt: true },
      }),
      prisma.client.count({ where: { tenantId } }),
      prisma.client.count({ where: { tenantId, status: "ACTIVE" } }),
      prisma.socialPost.count({ where: { tenantId } }),
      prisma.socialPost.count({ where: { tenantId, status: "PUBLISHED" } }),
      prisma.aiContent.count({ where: { tenantId } }),
      prisma.location.count({ where: { tenantId } }),
      prisma.socialChannel.groupBy({
        by: ["platform"],
        where: { tenantId, isActive: true },
      }),
      prisma.review.aggregate({
        where: { OR: [{ tenantId }, { location: { tenantId } }] },
        _avg: { starRating: true },
        _count: { _all: true },
      }),
      prisma.taskItem.count({ where: { tenantId, status: "PENDING" } }),
      prisma.marketingCampaign.count({ where: { tenantId } }),
      prisma.ticket.count({ where: { tenantId, status: "OPEN" } }),
      prisma.invoice.aggregate({
        where: { tenantId, status: "PAID", currency: "USD", paidAt: { gte: currentPeriodStart } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          tenantId,
          status: "PAID",
          currency: "USD",
          paidAt: { gte: previousPeriodStart, lt: currentPeriodStart },
        },
        _sum: { amount: true },
      }),
      prisma.subscription.findFirst({
        where: { tenantId },
        include: { plan: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.socialPost.findMany({
        where: { tenantId, status: "PUBLISHED", publishedAt: { gte: activityStart } },
        select: { publishedAt: true },
      }),
      prisma.crmLead.findMany({
        where: { tenantId, createdAt: { gte: activityStart } },
        select: { createdAt: true },
      }),
    ]);

    if (!tenant) {
      throw new Error("Authenticated tenant was not found");
    }

    const currentRevenueUSD = currentRevenue._sum.amount ?? 0;
    const previousRevenueUSD = previousRevenue._sum.amount ?? 0;
    const revenueGrowthPercent = previousRevenueUSD > 0
      ? Math.round(((currentRevenueUSD - previousRevenueUSD) / previousRevenueUSD) * 1000) / 10
      : null;

    const activity = new Map<string, { date: string; publishedPosts: number; newLeads: number }>();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - offset);
      const key = date.toISOString().slice(0, 10);
      activity.set(key, { date: key, publishedPosts: 0, newLeads: 0 });
    }
    for (const post of recentPosts) {
      if (!post.publishedAt) continue;
      const row = activity.get(post.publishedAt.toISOString().slice(0, 10));
      if (row) row.publishedPosts += 1;
    }
    for (const lead of recentLeads) {
      const row = activity.get(lead.createdAt.toISOString().slice(0, 10));
      if (row) row.newLeads += 1;
    }

    return {
      tenantId,
      tenant: {
        name: tenant.name,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
      },
      totalCustomers,
      activeCustomers,
      // Backward-compatible aliases; both remain sourced from tenant records.
      customerCount: activeCustomers,
      totalSocialPosts,
      publishedSocialPosts,
      socialPostsCount: publishedSocialPosts,
      aiContentsCount,
      locationsCount,
      connectedPlatformCount: activeChannelPlatforms.length,
      connectedPlatforms: activeChannelPlatforms.map((item) => item.platform),
      avgRating: reviewSummary._avg.starRating === null
        ? null
        : Number(reviewSummary._avg.starRating.toFixed(1)),
      reviewsCount: reviewSummary._count._all,
      pendingTasks,
      campaignsCount,
      openTicketsCount,
      paidRevenueLast30DaysUSD: currentRevenueUSD,
      paidRevenuePrevious30DaysUSD: previousRevenueUSD,
      revenueGrowthPercent,
      subscription: subscription
        ? {
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            autoRenew: subscription.autoRenew,
            plan: {
              name: subscription.plan.name,
              price: subscription.plan.price,
              currency: subscription.plan.currency,
              interval: subscription.plan.interval,
              maxAiUsage: subscription.plan.maxAiUsage,
            },
          }
        : null,
      activityTrend: Array.from(activity.values()),
      generatedAt: now.toISOString(),
      dataSource: "DATABASE",
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Business Profile & Multi-Branch
  // ---------------------------------------------------------------------------
  static async getBusinessProfile(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        locations: true,
      },
    });

    const branches = await prisma.branch.findMany({
      where: { organization: { tenantId } },
    });

    return {
      tenant,
      branches,
      workingHours: {
        monday: "09:00 - 18:00",
        tuesday: "09:00 - 18:00",
        wednesday: "09:00 - 18:00",
        thursday: "09:00 - 18:00",
        friday: "09:00 - 18:00",
        saturday: "10:00 - 16:00",
        sunday: "Closed",
      },
      categories: ["Marketing Agency", "Digital Services", "Consulting"],
      serviceAreas: ["Greater Metropolitan Area", "Regional North", "Online / Worldwide"],
      documents: [
        { id: "doc_1", name: "Business License.pdf", type: "PDF", uploadedAt: new Date() },
        { id: "doc_2", name: "Tax Certificate.pdf", type: "PDF", uploadedAt: new Date() },
      ],
    };
  }

  static async updateBusinessProfile(tenantId: string, data: any) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        domain: data.domain,
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Team Management
  // ---------------------------------------------------------------------------
  static async getTeamMembers(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        mfaEnabled: true,
        createdAt: true,
        roles: {
          include: { role: true },
        },
      },
    });
  }

  static async getPendingTeamInvitations(tenantId: string) {
    const invitationLogs = await prisma.auditLog.findMany({
      where: { tenantId, action: "TEAM_INVITATION_CREATED", resource: "VerificationToken" },
      select: { resourceId: true, details: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const tokenIds = invitationLogs.map((log) => log.resourceId).filter((id): id is string => Boolean(id));
    if (tokenIds.length === 0) return [];
    const activeTokens = await prisma.verificationToken.findMany({
      where: { id: { in: tokenIds }, type: "INVITATION", expiresAt: { gt: new Date() } },
      select: { id: true, identifier: true, expiresAt: true, createdAt: true },
    });
    const activeById = new Map(activeTokens.map((token) => [token.id, token]));
    return invitationLogs.flatMap((log) => {
      const token = log.resourceId ? activeById.get(log.resourceId) : undefined;
      if (!token) return [];
      let details: Record<string, unknown> = {};
      try { details = log.details ? JSON.parse(log.details) : {}; } catch { details = {}; }
      return [{
        id: token.id,
        email: token.identifier,
        role: typeof details.role === "string" ? details.role : null,
        deliveryStatus: typeof details.deliveryStatus === "string" ? details.deliveryStatus : "UNKNOWN",
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      }];
    });
  }

  static async inviteTeamMember(tenantId: string, email: string, roleName: string) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole = String(roleName || "PARTNER_MEMBER").trim().toUpperCase();
    const allowedRoles = new Set(["PARTNER_ADMIN", "PARTNER_MANAGER", "PARTNER_MEMBER"]);
    if (!tenantId) throw new PartnerPortalServiceError("Authenticated tenant context is required", 403, "TENANT_REQUIRED");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new PartnerPortalServiceError("A valid team member email is required", 400, "INVALID_EMAIL");
    }
    if (!allowedRoles.has(normalizedRole)) {
      throw new PartnerPortalServiceError("Unsupported partner role", 400, "INVALID_ROLE");
    }
    const [tenant, existingUser] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } }),
      prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true, tenantId: true } }),
    ]);
    if (!tenant) throw new PartnerPortalServiceError("Authenticated tenant was not found", 404, "TENANT_NOT_FOUND");
    if (existingUser) throw new PartnerPortalServiceError("A user with this email already exists", 409, "USER_ALREADY_EXISTS");

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const record = await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        type: "INVITATION",
        expiresAt,
      },
    });

    const registrationUrl = `${(process.env.PARTNER_URL || "http://localhost:3001").replace(/\/$/, "")}/register?email=${encodeURIComponent(normalizedEmail)}`;
    const webhookUrl = process.env.TEAM_INVITE_DELIVERY_WEBHOOK_URL?.trim();
    let deliveryStatus: "DELIVERED" | "NOT_CONFIGURED" | "FAILED" = webhookUrl ? "FAILED" : "NOT_CONFIGURED";
    let providerStatus: number | null = null;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.TEAM_INVITE_DELIVERY_WEBHOOK_TOKEN
              ? { Authorization: `Bearer ${process.env.TEAM_INVITE_DELIVERY_WEBHOOK_TOKEN}` }
              : {}),
          },
          body: JSON.stringify({
            tenantId,
            tenantName: tenant.name,
            email: normalizedEmail,
            role: normalizedRole,
            invitationToken: token,
            registrationUrl,
            expiresAt: expiresAt.toISOString(),
          }),
        });
        providerStatus = response.status;
        deliveryStatus = response.ok ? "DELIVERED" : "FAILED";
      } catch (error) {
        console.error("[partner:teamInviteDelivery]", error);
        deliveryStatus = "FAILED";
      }
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "TEAM_INVITATION_CREATED",
        resource: "VerificationToken",
        resourceId: record.id,
        details: JSON.stringify({ email: normalizedEmail, role: normalizedRole, deliveryStatus, expiresAt: expiresAt.toISOString() }),
      },
    });

    return {
      id: record.id,
      email: normalizedEmail,
      role: normalizedRole,
      status: "PENDING",
      deliveryStatus,
      providerStatus,
      expiresAt,
      registrationUrl,
      activationLink: null,
      roleAssignmentStatus: "PENDING_REGISTRATION_AND_ADMIN_ASSIGNMENT",
      // Manual fallback for an authorized partner administrator when no provider is configured.
      invitationToken: token,
      message: deliveryStatus === "DELIVERED"
        ? "The configured delivery provider accepted the invitation."
        : deliveryStatus === "NOT_CONFIGURED"
          ? "Invitation saved, but delivery is not configured. Share the manual code securely."
          : "Invitation saved, but the configured delivery provider did not accept it.",
    };
  }

  static async updateMemberStatus(tenantId: string, userId: string, isActive: boolean) {
    const member = await prisma.user.findFirst({ where: { id: userId, tenantId }, select: { id: true } });
    if (!member) throw new PartnerPortalServiceError("Team member not found for this tenant", 404, "TEAM_MEMBER_NOT_FOUND");
    return prisma.user.update({
      where: { id: member.id },
      data: { isActive },
    });
  }

  static async bulkImportTeam(tenantId: string, members: Array<{ email: string; firstName: string; lastName: string; role: string }>) {
    const results = [];
    for (const m of members) {
      try {
        const invitation = await this.inviteTeamMember(tenantId, m.email, m.role);
        results.push({ email: invitation.email, status: invitation.status, deliveryStatus: invitation.deliveryStatus });
      } catch (error) {
        results.push({ email: m.email, status: "ERROR", error: error instanceof Error ? error.message : "Invitation failed" });
      }
    }
    return { importedCount: results.length, details: results };
  }

  static async bulkExportTeam(tenantId: string) {
    const users = await this.getTeamMembers(tenantId);
    return users.map((u) => ({
      ID: u.id,
      Email: u.email,
      Name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      Active: u.isActive ? "YES" : "NO",
      Role: u.roles.map((r) => r.role.name).join(", ") || "MEMBER",
      Joined: u.createdAt.toISOString(),
    }));
  }

  // ---------------------------------------------------------------------------
  // 4. Customer Management
  // ---------------------------------------------------------------------------
  static async getCustomers(tenantId: string) {
    return prisma.client.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createCustomer(tenantId: string, data: { firstName: string; lastName: string; email: string; phone?: string; status?: string }) {
    await this.ensureTenant(tenantId);
    return prisma.client.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        status: data.status || "ACTIVE",
      },
    });
  }

  static async getCustomerTimeline(clientId: string) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    const timeline = [
      { id: "act_1", type: "CREATION", title: "Customer Account Created", timestamp: client?.createdAt },
      { id: "act_2", type: "EMAIL", title: "Welcome Email Sent", timestamp: new Date(Date.now() - 86400000) },
      { id: "act_3", type: "CALL", title: "Onboarding Call Completed", timestamp: new Date() },
    ];
    return { client, timeline };
  }

  // ---------------------------------------------------------------------------
  // 5. Extended Google Business Profile
  // ---------------------------------------------------------------------------
  static async getExtendedGbpData(tenantId: string) {
    const locations = await prisma.location.findMany({
      where: { tenantId },
      include: {
        gbpPosts: true,
        reviews: true,
        gbpProducts: true,
        gbpServices: true,
        gbpMedia: true,
        gbpQuestions: { include: { answers: true } },
        gbpInsights: true,
        gbpMessages: true,
      },
    });

    return {
      locations,
      verificationStatus: locations.length ? "VERIFIED" : "PENDING_VERIFICATION",
      bulkOperationsSupported: true,
    };
  }

  static async createGbpPost(tenantId: string, locationId: string, summary: string, topicType = "STANDARD", callToAction = "LEARN_MORE") {
    const location = await prisma.location.findFirst({ where: { id: locationId, tenantId }, select: { id: true } });
    if (!location) throw new Error("Google Business location was not found for this tenant.");
    return prisma.gbpPost.create({
      data: {
        locationId,
        summary,
        topicType,
        callToAction,
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
        publishedAt: null,
      },
    });
  }

  static async replyReview(tenantId: string, reviewId: string, replyComment: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, location: { tenantId } },
      select: { id: true },
    });
    if (!review) return null;

    return prisma.review.update({
      where: { id: review.id },
      data: {
        replyComment,
        replyUpdateTime: new Date(),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Omnichannel Social Media Suite (8 Platforms)
  // ---------------------------------------------------------------------------
  static async getSocialSuiteData(tenantId: string) {
    const channels = await prisma.socialChannel.findMany({ where: { tenantId } });
    const posts = await prisma.socialPost.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const platforms = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TWITTER_X", "THREADS", "YOUTUBE", "TIKTOK", "PINTEREST"];

    return { channels, posts, supportedPlatforms: platforms };
  }

  static async scheduleSocialPost(
    tenantId: string,
    createdByUserId: string,
    data: { content: string; platforms: string[]; scheduledAt?: Date | string; imageUrls?: string[] },
  ) {
    return prisma.socialPost.create({
      data: {
        tenantId,
        content: data.content,
        platform: data.platforms[0],
        platforms: JSON.stringify(data.platforms),
        imageUrls: JSON.stringify(data.imageUrls || []),
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
        createdByUserId,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 7. AI Assistant Studio (8 Tools)
  // ---------------------------------------------------------------------------
  static async generateAiToolContent(tenantId: string, type: string, prompt: string) {
    await this.ensureTenant(tenantId);
    const prefix = `[AI ${type.toUpperCase()} ASSISTANT]: `;
    let resultText = "";

    switch (type.toUpperCase()) {
      case "CONTENT":
        resultText = `${prefix}Here is a compelling social post caption optimized for conversion:\n\n✨ "Transform your digital footprint with AI-driven marketing strategies! Discover seamless business scaling today. #MarketingExcellence #GBS"`;
        break;
      case "IMAGE":
        resultText = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60`;
        break;
      case "MARKETING":
        resultText = `${prefix}Marketing Strategy Blueprint:\n1. Launch targeted local GBP search campaign.\n2. Automated review request follow-up after 24 hrs.\n3. Weekly omnichannel social video reels.`;
        break;
      case "ADVISOR":
        resultText = `${prefix}Business Performance Insight:\nYour lead conversion rate increased by +14% this month. Recommendation: Increase budget on Instagram carousel posts.`;
        break;
      case "SEO":
        resultText = `${prefix}SEO Recommendations:\n• Target primary keyword: "Best local agency services"\n• Add schema metadata for business hours & address.`;
        break;
      case "REVIEW":
        resultText = `${prefix}Thank you so much for your feedback! We are thrilled to hear you had a great experience with our team. Looking forward to serving you again!`;
        break;
      case "CAMPAIGN":
        resultText = `${prefix}Campaign Concept: "Summer Growth Blitz"\nChannel: Email + SMS\nOffer: 20% discount on initial consultation.`;
        break;
      case "ANALYTICS":
        resultText = `${prefix}Analytics Summary: 84,200 impressions, 4.2% CTR, 312 lead conversions across Google & Social.`;
        break;
      default:
        resultText = `${prefix}AI generated response for "${prompt}"`;
    }

    const aiContent = await prisma.aiContent.create({
      data: {
        tenantId,
        prompt,
        result: resultText,
        type: type.toUpperCase(),
      },
    });

    return aiContent;
  }

  static async getAiHistory(tenantId: string) {
    return prisma.aiContent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Marketing Campaigns & Automations
  // ---------------------------------------------------------------------------
  static async getMarketingCampaigns(tenantId: string) {
    await this.ensureTenant(tenantId);
    return prisma.marketingCampaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createMarketingCampaign(tenantId: string, data: any) {
    await this.ensureTenant(tenantId);
    return prisma.marketingCampaign.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type || "EMAIL",
        channel: data.channel || "EMAIL",
        status: data.status || "ACTIVE",
        audienceSegment: data.audienceSegment || "ALL",
        content: data.content,
        subject: data.subject,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 9. CRM Pipelines & Deals
  // ---------------------------------------------------------------------------
  static async getCrmPipelines(tenantId: string) {
    const pipelines = await prisma.crmPipeline.findMany({
      include: {
        stages: {
          include: {
            opportunities: {
              include: { activities: true },
            },
          },
        },
      },
    });

    if (!pipelines.length) {
      const defaultPipeline = await prisma.crmPipeline.create({
        data: {
          name: "Default Sales Pipeline",
          isDefault: true,
          stages: {
            create: [
              { name: "New Lead", order: 1 },
              { name: "Contacted", order: 2 },
              { name: "Proposal Sent", order: 3 },
              { name: "Closed Won", order: 4 },
            ],
          },
        },
        include: {
          stages: {
            include: { opportunities: true },
          },
        },
      });
      return [defaultPipeline];
    }

    return pipelines;
  }

  static async updateOpportunityStage(opportunityId: string, stageId: string, status?: string) {
    return prisma.crmOpportunity.update({
      where: { id: opportunityId },
      data: {
        stageId,
        ...(status ? { status } : {}),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Calendar & Task Manager
  // ---------------------------------------------------------------------------
  static async getCalendarAndTasks(tenantId: string) {
    await this.ensureTenant(tenantId);
    const events = await prisma.calendarEvent.findMany({
      where: { tenantId },
      orderBy: { startTime: "asc" },
    });

    const tasks = await prisma.taskItem.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    return { events, tasks };
  }

  static async createCalendarEvent(tenantId: string, data: any) {
    await this.ensureTenant(tenantId);
    return prisma.calendarEvent.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description,
        eventType: data.eventType || "MEETING",
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        location: data.location,
      },
    });
  }

  static async createTaskItem(tenantId: string, data: any) {
    await this.ensureTenant(tenantId);
    return prisma.taskItem.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description,
        priority: data.priority || "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 11. Media Storage & Files
  // ---------------------------------------------------------------------------
  static async getMediaAssets(tenantId: string) {
    await this.ensureTenant(tenantId);
    return prisma.mediaAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async uploadMediaAsset(tenantId: string, data: { name: string; fileUrl: string; fileType: string; fileSize?: number; category?: string }) {
    await this.ensureTenant(tenantId);
    return prisma.mediaAsset.create({
      data: {
        tenantId,
        name: data.name,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize || 1024,
        category: data.category || "GENERAL",
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 12. Reports & Analytics
  // ---------------------------------------------------------------------------
  static async getReports(tenantId: string, reportType = "BUSINESS") {
    await this.ensureTenant(tenantId);
    const [
      totalClients,
      activeClients,
      paidRevenue,
      totalInvoices,
      totalLeads,
      convertedLeads,
      locations,
      totalPosts,
      publishedPosts,
      aiUsage,
      aiTokens,
      campaigns,
      reviews,
      reviewRating,
      totalTasks,
      completedTasks,
      scheduled,
    ] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.client.count({ where: { tenantId, status: "ACTIVE" } }),
      prisma.invoice.aggregate({
        where: { tenantId, status: "PAID", currency: "USD" },
        _sum: { amount: true },
      }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.crmLead.count({ where: { tenantId } }),
      prisma.crmLead.count({ where: { tenantId, status: "CONVERTED" } }),
      prisma.location.count({ where: { tenantId } }),
      prisma.socialPost.count({ where: { tenantId } }),
      prisma.socialPost.count({ where: { tenantId, status: "PUBLISHED" } }),
      prisma.aiUsageLog.count({ where: { tenantId } }),
      prisma.aiUsageLog.aggregate({ where: { tenantId }, _sum: { totalTokens: true } }),
      prisma.marketingCampaign.count({ where: { tenantId } }),
      prisma.review.count({ where: { tenantId } }),
      prisma.review.aggregate({ where: { tenantId }, _avg: { starRating: true } }),
      prisma.taskItem.count({ where: { tenantId } }),
      prisma.taskItem.count({ where: { tenantId, status: "COMPLETED" } }),
      prisma.scheduledReport.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    ]);

    const conversionRate = totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 1000) / 10
      : null;
    const activeClientRate = totalClients > 0
      ? Math.round((activeClients / totalClients) * 1000) / 10
      : null;
    const taskCompletionRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 1000) / 10
      : null;

    const reportSuites = [
      {
        id: "business",
        title: "Business activity",
        metric: `${activeClients} active clients`,
        detail: `${totalClients} total clients; ${activeClientRate === null ? "no rate available" : `${activeClientRate}% active`}`,
      },
      {
        id: "revenue",
        title: "Revenue & billing",
        metric: `$${(paidRevenue._sum.amount ?? 0).toLocaleString()} paid`,
        detail: `${totalInvoices} recorded invoices (USD total shown)`,
      },
      {
        id: "leads",
        title: "Leads & conversions",
        metric: `${totalLeads} recorded leads`,
        detail: `${convertedLeads} converted; ${conversionRate === null ? "no conversion rate" : `${conversionRate}% conversion`}`,
      },
      {
        id: "gbp",
        title: "Google Business Profile",
        metric: `${locations} connected locations`,
        detail: "Engagement metrics require a successful Google sync",
      },
      {
        id: "social",
        title: "Social publishing",
        metric: `${publishedPosts} published posts`,
        detail: `${totalPosts} total persisted posts`,
      },
      {
        id: "ai",
        title: "AI tool usage",
        metric: `${aiTokens._sum.totalTokens ?? 0} logged tokens`,
        detail: `${aiUsage} persisted usage events`,
      },
      {
        id: "marketing",
        title: "Marketing campaigns",
        metric: `${campaigns} recorded campaigns`,
        detail: "ROI is unavailable until provider conversion data is recorded",
      },
      {
        id: "reviews",
        title: "Reputation & reviews",
        metric: reviewRating._avg.starRating === null
          ? "No rating data"
          : `${Math.round(reviewRating._avg.starRating * 10) / 10} average rating`,
        detail: `${reviews} persisted reviews`,
      },
      {
        id: "productivity",
        title: "Team productivity",
        metric: `${completedTasks} completed tasks`,
        detail: `${totalTasks} total tasks; ${taskCompletionRate === null ? "no completion rate" : `${taskCompletionRate}% complete`}`,
      },
    ];

    return {
      activeReportType: reportType,
      suites: reportSuites,
      scheduled,
      generatedAt: new Date().toISOString(),
      dataSource: "DATABASE",
    };
  }

  // ---------------------------------------------------------------------------
  // 13. Notifications & Preferences
  // ---------------------------------------------------------------------------
  static async getNotificationPreferences(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const defaultPrefs = {
      email: true,
      sms: false,
      whatsapp: true,
      push: true,
      inApp: true,
      reviewAlerts: true,
      leadAlerts: true,
      billingAlerts: true,
    };

    return user?.notificationPreferences
      ? JSON.parse(user.notificationPreferences)
      : defaultPrefs;
  }

  static async updateNotificationPreferences(userId: string, prefs: any) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: JSON.stringify(prefs),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 14. Subscriptions & Billing
  // ---------------------------------------------------------------------------
  static async getSubscriptionOverview(tenantId: string) {
    const subscriptions = await prisma.subscription.findMany({
      where: { tenantId },
      include: { plan: true },
    });

    const invoices = await prisma.invoice.findMany({
      where: { tenantId },
      include: { payments: true },
      orderBy: { createdAt: "desc" },
    });

    const addons = await prisma.billingAddon.findMany({ where: { isActive: true } });

    return {
      currentSubscription: subscriptions[0] || {
        status: "ACTIVE",
        plan: { name: "Partner Enterprise Pro", price: 299.0, interval: "MONTHLY" },
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
      invoices,
      availableAddons: addons,
    };
  }

  // ---------------------------------------------------------------------------
  // 15. Enterprise Global Command Search (9 Entities)
  // ---------------------------------------------------------------------------
  static async globalSearch(tenantId: string, query: string) {
    await this.ensureTenant(tenantId);
    const q = query.toLowerCase();

    const [customers, posts, reviews, locations, campaigns, tasks, assets] = await Promise.all([
      prisma.client.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 5,
      }),
      prisma.socialPost.findMany({
        where: { tenantId, content: { contains: q } },
        take: 5,
      }),
      prisma.review.findMany({
        where: { location: { tenantId }, comment: { contains: q } },
        take: 5,
      }),
      prisma.location.findMany({
        where: { tenantId, title: { contains: q } },
        take: 5,
      }),
      prisma.marketingCampaign.findMany({
        where: { tenantId, name: { contains: q } },
        take: 5,
      }),
      prisma.taskItem.findMany({
        where: { tenantId, title: { contains: q } },
        take: 5,
      }),
      prisma.mediaAsset.findMany({
        where: { tenantId, name: { contains: q } },
        take: 5,
      }),
    ]);

    return {
      query,
      results: [
        ...customers.map((c) => ({ type: "CUSTOMER", title: `${c.firstName} ${c.lastName}`, subtitle: c.email, link: `/customers?id=${c.id}` })),
        ...posts.map((p) => ({ type: "SOCIAL_POST", title: p.content.slice(0, 40) + "...", subtitle: `Status: ${p.status}`, link: `/social` })),
        ...reviews.map((r) => ({ type: "REVIEW", title: `⭐ ${r.starRating} Rating`, subtitle: r.comment || "Review", link: `/gbp` })),
        ...locations.map((l) => ({ type: "GBP_LOCATION", title: l.title || "GBP Location", subtitle: l.address || "", link: `/gbp` })),
        ...campaigns.map((cm) => ({ type: "CAMPAIGN", title: cm.name, subtitle: `Type: ${cm.type}`, link: `/marketing` })),
        ...tasks.map((t) => ({ type: "TASK", title: t.title, subtitle: `Priority: ${t.priority}`, link: `/calendar-tasks` })),
        ...assets.map((a) => ({ type: "FILE", title: a.name, subtitle: a.fileType, link: `/files` })),
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // 16. Workflows & Approvals
  // ---------------------------------------------------------------------------
  static async getWorkflows(tenantId: string) {
    if (!tenantId) throw new Error("Authenticated tenant context is required");
    const [automationRules, approvalRequests] = await Promise.all([
      prisma.automationRule.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          triggerType: true,
          actionType: true,
          lastRunAt: true,
          runCount: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.approvalRequest.findMany({
        where: { tenantId, status: "PENDING" },
        select: {
          id: true,
          requesterId: true,
          resourceType: true,
          resourceId: true,
          currentStep: true,
          status: true,
          comments: true,
          createdAt: true,
          workflow: { select: { name: true, triggerType: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { automationRules, approvalRequests, dataSource: "DATABASE" };
  }
}
