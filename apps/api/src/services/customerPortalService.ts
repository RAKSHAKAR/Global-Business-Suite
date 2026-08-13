import { randomUUID } from "crypto";
import { prisma } from "@saas/database";

export class CustomerPortalServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CustomerPortalServiceError";
  }
}

const requireText = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new CustomerPortalServiceError(400, "INVALID_CUSTOMER_REQUEST", `${field} is required.`);
  }
  return value.trim();
};

const parseJsonObject = (value: string, field: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new CustomerPortalServiceError(500, "INVALID_STORED_CUSTOMER_DATA", `${field} contains invalid JSON.`);
  }
};

/**
 * Customer self-service operations.
 *
 * This service deliberately has no demo-data fallback. Reads return persisted
 * rows (or honest empty collections) and writes either return the committed row
 * or throw. Provider-dependent actions fail with an explicit capability error.
 */
export class CustomerPortalService {
  static async ensureTenantAndClient(tenantId: string, clientId: string) {
    const requiredTenantId = requireText(tenantId, "tenantId");
    const requiredClientId = requireText(clientId, "clientId");
    const client = await prisma.client.findFirst({
      where: { id: requiredClientId, tenantId: requiredTenantId },
    });

    if (!client) {
      throw new CustomerPortalServiceError(
        404,
        "CUSTOMER_PROFILE_NOT_FOUND",
        "The customer profile was not found in this tenant.",
      );
    }

    return client;
  }

  private static async ensureTenant(tenantId: string) {
    const requiredTenantId = requireText(tenantId, "tenantId");
    const tenant = await prisma.tenant.findUnique({
      where: { id: requiredTenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new CustomerPortalServiceError(404, "TENANT_NOT_FOUND", "Tenant not found.");
    }
    return tenant.id;
  }

  private static async ensureUser(userId: string) {
    const requiredUserId = requireText(userId, "userId");
    const user = await prisma.user.findUnique({
      where: { id: requiredUserId },
      select: { id: true },
    });
    if (!user) {
      throw new CustomerPortalServiceError(404, "CUSTOMER_USER_NOT_FOUND", "Customer user not found.");
    }
    return user.id;
  }

  // Dashboard layout and metrics
  static async getDashboardLayout(userId: string) {
    const requiredUserId = await this.ensureUser(userId);
    const layout = await prisma.dashboardLayout.findUnique({ where: { userId: requiredUserId } });
    return layout ?? {
      id: null,
      userId: requiredUserId,
      layoutJson: "[]",
      updatedAt: null,
      persisted: false,
    };
  }

  static async saveDashboardLayout(userId: string, layoutJson: string) {
    const requiredUserId = await this.ensureUser(userId);
    const serializedLayout = requireText(layoutJson, "layoutJson");
    try {
      if (!Array.isArray(JSON.parse(serializedLayout))) throw new Error("not an array");
    } catch {
      throw new CustomerPortalServiceError(
        400,
        "INVALID_DASHBOARD_LAYOUT",
        "layoutJson must be a JSON array.",
      );
    }

    return prisma.dashboardLayout.upsert({
      where: { userId: requiredUserId },
      update: { layoutJson: serializedLayout },
      create: { userId: requiredUserId, layoutJson: serializedLayout },
    });
  }

  static async getDashboardMetrics(tenantId: string, clientId: string) {
    await this.ensureTenantAndClient(tenantId, clientId);
    const now = new Date();
    const [
      activeServicesCount,
      ordersCount,
      upcomingAppointmentsCount,
      invoices,
      openTicketsCount,
      loyalty,
      documentsCount,
      reviews,
    ] = await Promise.all([
      prisma.subscription.count({ where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] } } }),
      prisma.customerOrder.count({ where: { tenantId, clientId } }),
      prisma.customerAppointment.count({
        where: { tenantId, clientId, appointmentTime: { gte: now }, status: { not: "CANCELLED" } },
      }),
      prisma.invoice.findMany({
        where: { tenantId, status: { in: ["OPEN", "UNPAID", "OVERDUE", "PAST_DUE"] } },
        select: { amount: true, currency: true },
      }),
      prisma.ticket.count({ where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.customerLoyalty.findFirst({ where: { tenantId, clientId } }),
      prisma.customerDocument.count({ where: { tenantId, clientId } }),
      prisma.review.aggregate({
        where: { location: { tenantId } },
        _count: { _all: true },
        _avg: { starRating: true },
      }),
    ]);

    const currencies = new Set(invoices.map((invoice) => invoice.currency));
    return {
      source: "TENANT_DATABASE",
      activeServicesCount,
      ordersCount,
      upcomingAppointmentsCount,
      unpaidInvoicesTotal:
        currencies.size <= 1 ? invoices.reduce((total, invoice) => total + invoice.amount, 0) : null,
      unpaidInvoicesCurrency: currencies.size === 1 ? invoices[0]?.currency ?? null : null,
      openTicketsCount,
      loyaltyPoints: loyalty?.pointsBalance ?? null,
      loyaltyTier: loyalty?.tier ?? null,
      documentsCount,
      marketingHealthScore: null,
      googleRating: reviews._avg.starRating,
      reviewsCount: reviews._count._all,
    };
  }

  // Profile and account
  static async getProfile(clientId: string) {
    const requiredClientId = requireText(clientId, "clientId");
    const client = await prisma.client.findUnique({ where: { id: requiredClientId } });
    if (!client) {
      throw new CustomerPortalServiceError(404, "CUSTOMER_PROFILE_NOT_FOUND", "Customer profile not found.");
    }

    const user = await prisma.user.findFirst({
      where: { email: client.email, tenantId: client.tenantId },
      select: {
        avatarUrl: true,
        mfaEnabled: true,
        preferredLanguage: true,
        preferredTimezone: true,
        loginHistory: { orderBy: { createdAt: "desc" }, take: 20 },
        devices: { orderBy: { lastLogin: "desc" } },
      },
    });

    return {
      ...client,
      companyName: null,
      address: null,
      language: user?.preferredLanguage ?? null,
      timeZone: user?.preferredTimezone ?? null,
      mfaEnabled: user?.mfaEnabled ?? null,
      profilePhotoUrl: user?.avatarUrl ?? null,
      loginHistory:
        user?.loginHistory.map((entry) => ({
          id: entry.id,
          ip: entry.ipAddress,
          device: entry.userAgent,
          isSuccess: entry.isSuccess,
          failureReason: entry.failureReason,
          timestamp: entry.createdAt,
        })) ?? [],
      connectedDevices:
        user?.devices.map((device) => ({
          id: device.id,
          name: device.deviceName ?? device.model,
          manufacturer: device.manufacturer,
          osVersion: device.osVersion,
          ipAddress: device.ipAddress,
          lastActive: device.lastLogin,
          current: null,
        })) ?? [],
    };
  }

  static async updateProfile(clientId: string, data: unknown) {
    const requiredClientId = requireText(clientId, "clientId");
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new CustomerPortalServiceError(400, "INVALID_PROFILE_UPDATE", "Profile update data is required.");
    }

    const input = data as Record<string, unknown>;
    const update: { firstName?: string; lastName?: string; email?: string; phone?: string | null } = {};
    if (input.firstName !== undefined) update.firstName = requireText(input.firstName, "firstName");
    if (input.lastName !== undefined) update.lastName = requireText(input.lastName, "lastName");
    if (input.email !== undefined) update.email = requireText(input.email, "email").toLowerCase();
    if (input.phone !== undefined) {
      if (input.phone !== null && typeof input.phone !== "string") {
        throw new CustomerPortalServiceError(400, "INVALID_PROFILE_UPDATE", "phone must be a string or null.");
      }
      update.phone = typeof input.phone === "string" && input.phone.trim() ? input.phone.trim() : null;
    }
    if (!Object.keys(update).length) {
      throw new CustomerPortalServiceError(400, "INVALID_PROFILE_UPDATE", "No supported profile fields were provided.");
    }

    const existing = await prisma.client.findUnique({ where: { id: requiredClientId }, select: { id: true } });
    if (!existing) {
      throw new CustomerPortalServiceError(404, "CUSTOMER_PROFILE_NOT_FOUND", "Customer profile not found.");
    }
    return prisma.client.update({ where: { id: requiredClientId }, data: update });
  }

  // Subscriptions and service changes
  static async getServices(tenantId: string) {
    await this.ensureTenant(tenantId);
    const [subscriptions, availablePlans] = await Promise.all([
      prisma.subscription.findMany({
        where: { tenantId },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } }),
    ]);
    const subscribedPlanIds = new Set(subscriptions.map((subscription) => subscription.planId));

    return {
      source: "BILLING_DATABASE",
      purchasedServices: subscriptions.map((subscription) => ({
        id: subscription.id,
        planId: subscription.planId,
        name: subscription.plan.name,
        description: subscription.plan.description,
        status: subscription.status,
        price: subscription.plan.price,
        currency: subscription.plan.currency,
        interval: subscription.plan.interval,
        renewalDate: subscription.currentPeriodEnd,
        autoRenew: subscription.autoRenew,
      })),
      upgradesAvailable: availablePlans
        .filter((plan) => !subscribedPlanIds.has(plan.id))
        .map((plan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
        })),
    };
  }

  static async requestServiceChange(tenantId: string, serviceId: string, action: string) {
    await this.ensureTenant(tenantId);
    const requiredServiceId = requireText(serviceId, "serviceId");
    requireText(action, "action");
    const [subscription, plan] = await Promise.all([
      prisma.subscription.findFirst({ where: { id: requiredServiceId, tenantId }, select: { id: true } }),
      prisma.plan.findUnique({ where: { id: requiredServiceId }, select: { id: true } }),
    ]);
    if (!subscription && !plan) {
      throw new CustomerPortalServiceError(404, "SERVICE_NOT_FOUND", "Service or plan not found.");
    }
    throw new CustomerPortalServiceError(
      501,
      "SERVICE_CHANGE_WORKFLOW_NOT_IMPLEMENTED",
      "Service changes require a persisted approval workflow, which is not implemented for this endpoint.",
    );
  }

  // Orders
  static async getOrders(tenantId: string, clientId: string) {
    await this.ensureTenantAndClient(tenantId, clientId);
    return prisma.customerOrder.findMany({
      where: { tenantId, clientId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createOrder(tenantId: string, clientId: string, items: unknown[], total: number) {
    await this.ensureTenantAndClient(tenantId, clientId);
    if (!Array.isArray(items) || items.length === 0) {
      throw new CustomerPortalServiceError(400, "INVALID_ORDER", "At least one order item is required.");
    }
    if (!Number.isFinite(total) || total < 0) {
      throw new CustomerPortalServiceError(400, "INVALID_ORDER", "Order total must be a non-negative number.");
    }

    return prisma.customerOrder.create({
      data: {
        orderNumber: `CUST-${randomUUID()}`,
        tenantId,
        clientId,
        itemsJson: JSON.stringify(items),
        total,
        status: "PENDING",
        paymentStatus: "UNPAID",
      },
    });
  }

  // Appointments
  static async getAppointments(tenantId: string, clientId: string) {
    await this.ensureTenantAndClient(tenantId, clientId);
    return prisma.customerAppointment.findMany({
      where: { tenantId, clientId },
      orderBy: { appointmentTime: "asc" },
    });
  }

  static async bookAppointment(
    tenantId: string,
    clientId: string,
    data: { title?: unknown; appointmentTime?: unknown; durationMins?: unknown },
  ) {
    await this.ensureTenantAndClient(tenantId, clientId);
    const title = requireText(data?.title, "title");
    const appointmentTimeText = requireText(data?.appointmentTime, "appointmentTime");
    const appointmentTime = new Date(appointmentTimeText);
    if (Number.isNaN(appointmentTime.getTime())) {
      throw new CustomerPortalServiceError(400, "INVALID_APPOINTMENT", "appointmentTime must be a valid date.");
    }
    const durationMins = data?.durationMins === undefined ? 30 : Number(data.durationMins);
    if (!Number.isInteger(durationMins) || durationMins <= 0) {
      throw new CustomerPortalServiceError(400, "INVALID_APPOINTMENT", "durationMins must be a positive integer.");
    }

    return prisma.customerAppointment.create({
      data: {
        title,
        tenantId,
        clientId,
        appointmentTime,
        durationMins,
        status: "BOOKED",
        meetingLink: null,
      },
    });
  }

  // Google Business Profile reads. Publishing remains provider-owned elsewhere.
  static async getGbpData(tenantId: string) {
    await this.ensureTenant(tenantId);
    const locations = await prisma.location.findMany({
      where: { tenantId },
      include: {
        reviews: true,
        gbpPosts: true,
        gbpProducts: true,
        gbpServices: true,
        gbpQuestions: true,
      },
    });

    return {
      source: "TENANT_DATABASE",
      locations,
      updates: locations.flatMap((location) =>
        location.gbpPosts.map((post) => ({ ...post, locationId: location.id })),
      ),
      faqs: locations.flatMap((location) =>
        location.gbpQuestions.map((question) => ({ ...question, locationId: location.id })),
      ),
    };
  }

  static async submitReview(tenantId: string, locationId: string, starRating: number, comment: string) {
    const requiredLocationId = requireText(locationId, "locationId");
    if (!Number.isInteger(starRating) || starRating < 1 || starRating > 5) {
      throw new CustomerPortalServiceError(400, "INVALID_REVIEW", "starRating must be an integer from 1 to 5.");
    }
    requireText(comment, "comment");
    const location = await prisma.location.findFirst({ where: { id: requiredLocationId, tenantId }, select: { id: true } });
    if (!location) {
      throw new CustomerPortalServiceError(404, "GOOGLE_LOCATION_NOT_FOUND", "Google location not found.");
    }
    throw new CustomerPortalServiceError(
      501,
      "GOOGLE_REVIEW_SUBMISSION_NOT_IMPLEMENTED",
      "This endpoint cannot submit a review without a verified Google provider workflow.",
    );
  }

  // Local live-chat records. External channels require provider adapters.
  static async getMessages(tenantId: string, clientId: string) {
    await this.ensureTenantAndClient(tenantId, clientId);
    const conversations = await prisma.unifiedConversation.findMany({
      where: { tenantId, customerId: clientId },
      include: { messages: { where: { isInternalNote: false }, orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
    });

    return conversations.flatMap((conversation) =>
      conversation.messages.map((message) => ({
        id: message.id,
        conversationId: conversation.id,
        sender: message.senderType,
        senderName: message.senderName,
        channel: conversation.channel,
        content: message.content,
        contentType: message.contentType,
        timestamp: message.createdAt,
      })),
    );
  }

  static async sendMessage(tenantId: string, clientId: string, content: string, channel = "LIVE_CHAT") {
    await this.ensureTenantAndClient(tenantId, clientId);
    const messageContent = requireText(content, "content");
    const requestedChannel = channel === undefined ? "LIVE_CHAT" : requireText(channel, "channel");
    const normalizedChannel = requestedChannel.toUpperCase() === "CHAT" ? "LIVE_CHAT" : requestedChannel.toUpperCase();
    if (normalizedChannel !== "LIVE_CHAT") {
      throw new CustomerPortalServiceError(
        501,
        "MESSAGE_PROVIDER_ADAPTER_REQUIRED",
        `${normalizedChannel} messaging requires a configured outbound provider adapter.`,
      );
    }

    return prisma.$transaction(async (transaction) => {
      let conversation = await transaction.unifiedConversation.findFirst({
        where: {
          tenantId,
          customerId: clientId,
          channel: normalizedChannel,
          status: { notIn: ["CLOSED", "ARCHIVED"] },
        },
        orderBy: { lastMessageAt: "desc" },
      });
      if (!conversation) {
        conversation = await transaction.unifiedConversation.create({
          data: { tenantId, customerId: clientId, channel: normalizedChannel, status: "OPEN" },
        });
      }
      const message = await transaction.unifiedMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: "CUSTOMER",
          senderId: clientId,
          content: messageContent,
        },
      });
      await transaction.unifiedConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: message.createdAt },
      });
      return {
        id: message.id,
        conversationId: conversation.id,
        sender: message.senderType,
        channel: conversation.channel,
        content: message.content,
        contentType: message.contentType,
        timestamp: message.createdAt,
      };
    });
  }

  // Support
  static async getSupportData(tenantId: string) {
    await this.ensureTenant(tenantId);
    const [tickets, kbArticles] = await Promise.all([
      prisma.ticket.findMany({
        where: { tenantId },
        include: { messages: { where: { isInternal: false }, orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.knowledgeBase.findMany({
        where: { isPublished: true },
        select: { id: true, title: true, category: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return { tickets, kbArticles };
  }

  static async createSupportTicket(
    tenantId: string,
    clientId: string,
    subject: string,
    description: string,
    priority = "MEDIUM",
  ) {
    await this.ensureTenantAndClient(tenantId, clientId);
    const ticketSubject = requireText(subject, "subject");
    const message = requireText(description, "description");
    const normalizedPriority = requireText(priority, "priority").toUpperCase();
    if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(normalizedPriority)) {
      throw new CustomerPortalServiceError(400, "INVALID_SUPPORT_TICKET", "Unsupported ticket priority.");
    }

    return prisma.ticket.create({
      data: {
        tenantId,
        subject: ticketSubject,
        priority: normalizedPriority,
        status: "OPEN",
        messages: { create: { senderId: clientId, content: message, isInternal: false } },
      },
      include: { messages: true },
    });
  }

  // AI assistant
  static async generateAiAssistantResponse(tenantId: string, toolType: string, query: string) {
    await this.ensureTenant(tenantId);
    requireText(toolType, "toolType");
    requireText(query, "query");
    throw new CustomerPortalServiceError(
      501,
      "CUSTOMER_AI_ASSISTANT_NOT_IMPLEMENTED",
      "The customer AI assistant is not connected to an approved AI provider workflow.",
    );
  }

  // Document vault metadata
  static async getDocuments(tenantId: string, clientId: string) {
    await this.ensureTenantAndClient(tenantId, clientId);
    return prisma.customerDocument.findMany({
      where: { tenantId, clientId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async uploadDocument(
    tenantId: string,
    clientId: string,
    data: { name?: unknown; docType?: unknown; fileUrl?: unknown; fileSize?: unknown },
  ) {
    await this.ensureTenantAndClient(tenantId, clientId);
    const name = requireText(data?.name, "name");
    const fileUrl = requireText(data?.fileUrl, "fileUrl");
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      throw new CustomerPortalServiceError(400, "INVALID_DOCUMENT", "fileUrl must be a valid HTTPS URL.");
    }
    if (parsedUrl.protocol !== "https:") {
      throw new CustomerPortalServiceError(400, "INVALID_DOCUMENT", "fileUrl must use HTTPS.");
    }
    const docType = data?.docType === undefined ? "USER_UPLOAD" : requireText(data.docType, "docType").toUpperCase();
    const fileSize = data?.fileSize === undefined ? 0 : Number(data.fileSize);
    if (!Number.isInteger(fileSize) || fileSize < 0) {
      throw new CustomerPortalServiceError(400, "INVALID_DOCUMENT", "fileSize must be a non-negative integer.");
    }

    return prisma.customerDocument.create({
      data: {
        tenantId,
        clientId,
        name,
        docType,
        fileUrl: parsedUrl.toString(),
        fileSize,
        sharedBy: "CUSTOMER",
      },
    });
  }

  // Payments and invoices. Payment execution is intentionally unavailable here.
  static async getPaymentsData(tenantId: string, clientId: string) {
    await this.ensureTenantAndClient(tenantId, clientId);
    const [invoices, defaultPaymentMethod, configuredGateways] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId },
        include: { payments: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.savedPaymentMethod.findFirst({
        where: { tenantId, isDefault: true },
        select: {
          id: true,
          gateway: true,
          paymentType: true,
          cardBrand: true,
          last4: true,
          expMonth: true,
          expYear: true,
        },
      }),
      prisma.paymentGatewayConfig.count({ where: { isEnabled: true } }),
    ]);
    return {
      source: "BILLING_LEDGER",
      invoices,
      autoPaymentEnabled: Boolean(defaultPaymentMethod),
      defaultPaymentMethod,
      history: invoices.flatMap((invoice) =>
        invoice.payments.map((payment) => ({ ...payment, invoiceNumber: invoice.invoiceNumber })),
      ),
      paymentGatewayConfigured: configuredGateways > 0,
      paymentActionAvailable: false,
    };
  }

  static async payInvoice(tenantId: string, invoiceId: string, paymentMethodId: string) {
    await this.ensureTenant(tenantId);
    const requiredInvoiceId = requireText(invoiceId, "invoiceId");
    const requiredPaymentMethodId = requireText(paymentMethodId, "paymentMethodId");
    const invoice = await prisma.invoice.findFirst({ where: { id: requiredInvoiceId, tenantId }, select: { id: true } });
    if (!invoice) {
      throw new CustomerPortalServiceError(404, "INVOICE_NOT_FOUND", "Invoice not found.");
    }
    const paymentMethod = await prisma.savedPaymentMethod.findFirst({
      where: { id: requiredPaymentMethodId, tenantId },
      select: { gateway: true },
    });
    if (!paymentMethod) {
      throw new CustomerPortalServiceError(404, "PAYMENT_METHOD_NOT_FOUND", "Payment method not found.");
    }
    const gateway = await prisma.paymentGatewayConfig.findUnique({ where: { gateway: paymentMethod.gateway } });
    if (!gateway?.isEnabled) {
      throw new CustomerPortalServiceError(
        503,
        "PAYMENT_GATEWAY_NOT_CONFIGURED",
        "The saved payment method does not have an enabled payment gateway.",
      );
    }
    throw new CustomerPortalServiceError(
      501,
      "PAYMENT_PROVIDER_ADAPTER_REQUIRED",
      "Payment execution is not implemented by the customer portal service.",
    );
  }

  // Persisted scheduled reports
  static async getCustomerReports(tenantId: string) {
    await this.ensureTenant(tenantId);
    const reports = await prisma.scheduledReport.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return { source: "TENANT_DATABASE", domains: reports, reports };
  }

  // Notification preferences
  static async getNotificationPreferences(userId: string) {
    const requiredUserId = requireText(userId, "userId");
    const user = await prisma.user.findUnique({
      where: { id: requiredUserId },
      select: { notificationPreferences: true },
    });
    if (!user) {
      throw new CustomerPortalServiceError(404, "CUSTOMER_USER_NOT_FOUND", "Customer user not found.");
    }
    return user.notificationPreferences
      ? parseJsonObject(user.notificationPreferences, "notificationPreferences")
      : {};
  }

  static async updateNotificationPreferences(userId: string, prefs: unknown) {
    const requiredUserId = await this.ensureUser(userId);
    if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) {
      throw new CustomerPortalServiceError(
        400,
        "INVALID_NOTIFICATION_PREFERENCES",
        "Notification preferences must be an object.",
      );
    }
    const serialized = JSON.stringify(prefs);
    const updated = await prisma.user.update({
      where: { id: requiredUserId },
      data: { notificationPreferences: serialized },
      select: { notificationPreferences: true },
    });
    return parseJsonObject(updated.notificationPreferences ?? "{}", "notificationPreferences");
  }

  // Customer-scoped database search
  static async globalSearch(tenantId: string, clientId: string, query: string) {
    await this.ensureTenantAndClient(tenantId, clientId);
    if (typeof query !== "string") {
      throw new CustomerPortalServiceError(400, "INVALID_SEARCH_QUERY", "Search query must be a string.");
    }
    const q = query.trim();
    if (!q) return { query, results: [] };

    const [orders, invoices, appointments, documents, tickets, subscriptions] = await Promise.all([
      prisma.customerOrder.findMany({
        where: { tenantId, clientId, orderNumber: { contains: q } },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.findMany({
        where: { tenantId, invoiceNumber: { contains: q } },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customerAppointment.findMany({
        where: { tenantId, clientId, title: { contains: q } },
        take: 10,
        orderBy: { appointmentTime: "desc" },
      }),
      prisma.customerDocument.findMany({
        where: { tenantId, clientId, name: { contains: q } },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.ticket.findMany({
        where: { tenantId, subject: { contains: q } },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.findMany({
        where: { tenantId, plan: { name: { contains: q } } },
        include: { plan: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      query,
      results: [
        ...orders.map((order) => ({
          id: order.id,
          type: "ORDER",
          title: `Order #${order.orderNumber}`,
          subtitle: `Status: ${order.status} (${order.currency} ${order.total})`,
          link: "/orders",
        })),
        ...invoices.map((invoice) => ({
          id: invoice.id,
          type: "INVOICE",
          title: `Invoice #${invoice.invoiceNumber}`,
          subtitle: `Status: ${invoice.status} (${invoice.currency} ${invoice.amount})`,
          link: "/payments",
        })),
        ...appointments.map((appointment) => ({
          id: appointment.id,
          type: "APPOINTMENT",
          title: appointment.title,
          subtitle: appointment.appointmentTime.toISOString(),
          link: "/appointments",
        })),
        ...documents.map((document) => ({
          id: document.id,
          type: "DOCUMENT",
          title: document.name,
          subtitle: document.docType,
          link: "/documents",
        })),
        ...tickets.map((ticket) => ({
          id: ticket.id,
          type: "SUPPORT",
          title: ticket.subject,
          subtitle: ticket.status,
          link: "/support",
        })),
        ...subscriptions.map((subscription) => ({
          id: subscription.id,
          type: "SERVICE",
          title: subscription.plan.name,
          subtitle: subscription.status,
          link: "/services",
        })),
      ],
    };
  }

  // Persisted automation rules
  static async getWorkflows(tenantId: string) {
    await this.ensureTenant(tenantId);
    const workflows = await prisma.automationRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return {
      source: "TENANT_DATABASE",
      activeWorkflows: workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        type: workflow.triggerType,
        actionType: workflow.actionType,
        status: workflow.isActive ? "ACTIVE" : "INACTIVE",
        lastRunAt: workflow.lastRunAt,
        runCount: workflow.runCount,
      })),
    };
  }
}
