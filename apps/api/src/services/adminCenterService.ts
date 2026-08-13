import { prisma } from "@saas/database";

export class AdminCenterService {
  /**
   * Aggregate platform telemetry and system overview statistics
   */
  static async getDashboardStats() {
    const [
      totalTenants,
      totalUsers,
      totalRoles,
      totalPlans,
      activeSubscriptions,
      pendingApprovals,
      aiUsageCount,
      socialPostCount,
    ] = await Promise.all([
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.role.count(),
      prisma.plan.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      (prisma as any).approvalRequest.count({ where: { status: "PENDING" } }),
      prisma.aiContent.count(),
      prisma.socialPost.count(),
    ]);

    return {
      tenants: totalTenants,
      users: totalUsers,
      roles: totalRoles,
      plans: totalPlans,
      activeSubscriptions,
      pendingApprovals,
      aiUsageCount,
      socialPostCount,
      queueStatus: "HEALTHY",
      systemHealth: "OPERATIONAL",
    };
  }

  /**
   * Get White-Label branding configuration
   */
  static async getWhiteLabel(tenantId?: string) {
    const config = await (prisma as any).whiteLabelConfig.findFirst({
      where: tenantId ? { tenantId } : { tenantId: null },
    });

    if (config) return config;

    // Default branding
    return {
      id: "default-branding",
      tenantId: null,
      appTitle: "Global Business Suite",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "#D4AF37",
      secondaryColor: "#1A1A1A",
      themeMode: "DARK",
      customCss: "",
    };
  }

  /**
   * Upsert White-Label branding configuration
   */
  static async upsertWhiteLabel(data: {
    tenantId?: string;
    appTitle?: string;
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    themeMode?: string;
    customCss?: string;
  }) {
    const tenantId = data.tenantId || null;

    const existing = await (prisma as any).whiteLabelConfig.findFirst({
      where: { tenantId },
    });

    if (existing) {
      return (prisma as any).whiteLabelConfig.update({
        where: { id: existing.id },
        data: {
          appTitle: data.appTitle ?? existing.appTitle,
          logoUrl: data.logoUrl ?? existing.logoUrl,
          faviconUrl: data.faviconUrl ?? existing.faviconUrl,
          primaryColor: data.primaryColor ?? existing.primaryColor,
          secondaryColor: data.secondaryColor ?? existing.secondaryColor,
          themeMode: data.themeMode ?? existing.themeMode,
          customCss: data.customCss ?? existing.customCss,
        },
      });
    }

    return (prisma as any).whiteLabelConfig.create({
      data: {
        tenantId,
        appTitle: data.appTitle || "Global Business Suite",
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
        primaryColor: data.primaryColor || "#D4AF37",
        secondaryColor: data.secondaryColor || "#1A1A1A",
        themeMode: data.themeMode || "DARK",
        customCss: data.customCss,
      },
    });
  }

  /**
   * AI Prompt Templates & Versioning
   */
  static async getPromptTemplates() {
    return (prisma as any).promptTemplate.findMany({
      orderBy: { key: "asc" },
    });
  }

  static async upsertPromptTemplate(data: {
    key: string;
    title: string;
    systemPrompt: string;
    userPrompt: string;
    modelKey?: string;
  }) {
    const key = data.key.toUpperCase();
    const existing = await (prisma as any).promptTemplate.findUnique({
      where: { key },
    });

    if (existing) {
      return (prisma as any).promptTemplate.update({
        where: { key },
        data: {
          title: data.title,
          systemPrompt: data.systemPrompt,
          userPrompt: data.userPrompt,
          version: existing.version + 1,
          modelKey: data.modelKey || existing.modelKey,
        },
      });
    }

    return (prisma as any).promptTemplate.create({
      data: {
        key,
        title: data.title,
        systemPrompt: data.systemPrompt,
        userPrompt: data.userPrompt,
        version: 1,
        modelKey: data.modelKey || "gemini-1.5-pro",
      },
    });
  }

  /**
   * Notification Templates Control Center
   */
  static async getNotificationTemplates() {
    return (prisma as any).notificationTemplate.findMany({
      orderBy: { key: "asc" },
    });
  }

  static async upsertNotificationTemplate(data: {
    key: string;
    channel: string;
    subject: string;
    body: string;
    isActive?: boolean;
  }) {
    const key = data.key.toUpperCase();
    return (prisma as any).notificationTemplate.upsert({
      where: { key },
      update: {
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      create: {
        key,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * Enterprise Global Unified Search across platform entities
   */
  static async globalSearch(query: string) {
    const q = (query || "").trim();

    const [users, tenants, roles, auditLogs] = await Promise.all([
      prisma.user.findMany({
        where: q ? {
          OR: [
            { email: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
          ],
        } : {},
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
      prisma.tenant.findMany({
        where: q ? {
          OR: [
            { name: { contains: q } },
            { domain: { contains: q } },
          ],
        } : {},
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, domain: true },
      }),
      prisma.role.findMany({
        where: q ? {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
          ],
        } : {},
        take: 5,
        select: { id: true, name: true, description: true },
      }),
      prisma.auditLog.findMany({
        where: q ? {
          OR: [
            { action: { contains: q } },
            { resource: { contains: q } },
          ],
        } : {},
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, action: true, resource: true, createdAt: true },
      }),
    ]);

    return {
      results: [
        ...users.map((u) => ({
          type: "USER",
          title: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
          subtitle: u.email,
          url: "/users",
        })),
        ...tenants.map((t) => ({
          type: "TENANT",
          title: t.name,
          subtitle: t.domain || "Tenant Account",
          url: `/tenants`,
        })),
        ...roles.map((r) => ({
          type: "ROLE",
          title: r.name,
          subtitle: r.description || "RBAC Role",
          url: "/roles",
        })),
        ...auditLogs.map((a) => ({
          type: "AUDIT_LOG",
          title: a.action,
          subtitle: `Resource: ${a.resource}`,
          url: "/audit-logs",
        })),
      ],
    };
  }
}
