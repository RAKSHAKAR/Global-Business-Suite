import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import {
  CustomerPortalService,
  CustomerPortalServiceError,
} from "../../services/customerPortalService";
import { authMiddleware } from "../../middleware/auth";
import { requirePortalAccess } from "../../middleware/portalAccess";

export const customerPortalRouter = Router();
customerPortalRouter.use(authMiddleware);
customerPortalRouter.use(requirePortalAccess("CUSTOMER"));
customerPortalRouter.use(async (req: Request, res: Response, next) => {
  const user = (req as any).user;
  const userId = user?.userId || user?.id;
  const tenantId = user?.tenantId;

  if (!userId || !tenantId) {
    return res.status(403).json({
      error: "A tenant-bound customer session is required.",
      code: "CUSTOMER_TENANT_CONTEXT_REQUIRED",
    });
  }

  try {
    const client = await prisma.client.findFirst({
      where: { tenantId, email: user.email },
      select: { id: true },
    });
    if (!client) {
      return res.status(403).json({
        error: "No customer profile is linked to this account.",
        code: "CUSTOMER_PROFILE_REQUIRED",
      });
    }

    (req as any).customerContext = { userId, tenantId, clientId: client.id };
    next();
  } catch (error) {
    console.error("[customer:context]", error);
    return res.status(500).json({ error: "Failed to resolve customer context." });
  }
});

const getAuthenticatedTenant = (req: Request) => {
  const user = (req as any).user;
  const customerContext = (req as any).customerContext;
  return {
    tenantId:
      typeof customerContext?.tenantId === "string"
        ? customerContext.tenantId
        : typeof user?.tenantId === "string"
          ? user.tenantId
          : "",
    userId:
      typeof customerContext?.userId === "string"
        ? customerContext.userId
        : typeof (user?.userId || user?.id) === "string"
          ? user.userId || user.id
          : "",
  };
};

// Real, tenant-scoped dashboard summary. Unlike the legacy metrics endpoint this
// route never substitutes demo counts when a table is empty.
customerPortalRouter.get("/dashboard-summary", authMiddleware, async (req: Request, res: Response) => {
  const { tenantId } = getAuthenticatedTenant(req);
  if (!tenantId) {
    return res.status(400).json({ error: "A tenant-scoped customer is required.", code: "TENANT_REQUIRED" });
  }

  try {
    const now = new Date();
    const [subscription, invoices, ordersCount, appointmentsCount, openTicketsCount, documentsCount, locationsCount, reviews] =
      await Promise.all([
        prisma.subscription.findFirst({
          where: { tenantId },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.invoice.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            amount: true,
            currency: true,
            dueDate: true,
            paidAt: true,
            pdfUrl: true,
          },
        }),
        prisma.customerOrder.count({ where: { tenantId } }),
        prisma.customerAppointment.count({
          where: {
            tenantId,
            appointmentTime: { gte: now },
            status: { not: "CANCELLED" },
          },
        }),
        prisma.ticket.count({ where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.customerDocument.count({ where: { tenantId } }),
        prisma.location.count({ where: { tenantId } }),
        prisma.review.aggregate({
          where: { location: { tenantId } },
          _count: { _all: true },
          _avg: { starRating: true },
        }),
      ]);

    return res.json({
      source: "TENANT_DATABASE",
      subscription,
      recentInvoices: invoices,
      counts: {
        orders: ordersCount,
        upcomingAppointments: appointmentsCount,
        openTickets: openTicketsCount,
        documents: documentsCount,
        googleLocations: locationsCount,
        reviews: reviews._count._all,
      },
      reviewAverage: reviews._avg.starRating,
    });
  } catch (error) {
    console.error("[customer:dashboard-summary]", error);
    return res.status(500).json({ error: "Failed to load customer dashboard summary." });
  }
});

// Tenant-owned Google media library. A null googleMediaId is deliberately
// reported as LOCAL_ONLY; adding a source here does not pretend it was
// published to Google before the configured sync worker confirms it.
customerPortalRouter.get("/google-media", authMiddleware, async (req: Request, res: Response) => {
  const { tenantId } = getAuthenticatedTenant(req);
  if (!tenantId) {
    return res.status(400).json({ error: "A tenant-scoped customer is required.", code: "TENANT_REQUIRED" });
  }

  try {
    const [accounts, locations] = await Promise.all([
      prisma.gbpAccount.count({ where: { tenantId } }),
      prisma.location.findMany({
        where: { tenantId },
        orderBy: { title: "asc" },
        select: {
          id: true,
          title: true,
          locationName: true,
          verificationStatus: true,
          lastSyncAt: true,
          gbpMedia: { orderBy: { createdAt: "desc" } },
        },
      }),
    ]);
    return res.json({ connected: accounts > 0, locations });
  } catch (error) {
    console.error("[customer:google-media]", error);
    return res.status(500).json({ error: "Failed to load Google media." });
  }
});

customerPortalRouter.post("/google-media", authMiddleware, async (req: Request, res: Response) => {
  const { tenantId } = getAuthenticatedTenant(req);
  const { locationId, sourceUrl, mediaFormat, category, description } = req.body || {};
  if (!tenantId) {
    return res.status(400).json({ error: "A tenant-scoped customer is required.", code: "TENANT_REQUIRED" });
  }
  if (!locationId || !sourceUrl) {
    return res.status(400).json({ error: "Location and HTTPS media URL are required." });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    return res.status(400).json({ error: "Enter a valid HTTPS media URL." });
  }
  if (parsedUrl.protocol !== "https:") {
    return res.status(400).json({ error: "Media URLs must use HTTPS." });
  }

  try {
    const location = await prisma.location.findFirst({ where: { id: locationId, tenantId } });
    if (!location) return res.status(404).json({ error: "Google location not found." });

    const media = await prisma.gbpMedia.create({
      data: {
        locationId,
        sourceUrl: parsedUrl.toString(),
        mediaFormat: mediaFormat === "VIDEO" ? "VIDEO" : "PHOTO",
        category: typeof category === "string" && category ? category : "ADDITIONAL",
        description: typeof description === "string" && description.trim() ? description.trim() : null,
      },
    });
    return res.status(201).json({ media, publicationState: "LOCAL_ONLY" });
  } catch (error) {
    console.error("[customer:google-media:create]", error);
    return res.status(500).json({ error: "Failed to add media to the local library." });
  }
});

customerPortalRouter.delete("/google-media/:mediaId", authMiddleware, async (req: Request, res: Response) => {
  const { tenantId } = getAuthenticatedTenant(req);
  if (!tenantId) {
    return res.status(400).json({ error: "A tenant-scoped customer is required.", code: "TENANT_REQUIRED" });
  }

  try {
    const media = await prisma.gbpMedia.findFirst({
      where: { id: req.params.mediaId, location: { tenantId } },
    });
    if (!media) return res.status(404).json({ error: "Media item not found." });
    if (media.googleMediaId) {
      return res.status(409).json({
        error: "This item is synchronized with Google and must be removed through the Google publishing workflow.",
        code: "GOOGLE_MEDIA_DELETE_REQUIRES_PROVIDER",
      });
    }
    await prisma.gbpMedia.delete({ where: { id: media.id } });
    return res.status(204).send();
  } catch (error) {
    console.error("[customer:google-media:delete]", error);
    return res.status(500).json({ error: "Failed to remove the local media item." });
  }
});

const getContext = (req: Request) => {
  return (req as any).customerContext as {
    userId: string;
    tenantId: string;
    clientId: string;
  };
};

const sendCustomerPortalError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof CustomerPortalServiceError) {
    return res.status(error.statusCode).json({ error: error.message, code: error.code });
  }
  console.error("[customer:service]", error);
  return res.status(500).json({ error: fallbackMessage, code: "CUSTOMER_PORTAL_OPERATION_FAILED" });
};

// 1. Dashboard Layout & Telemetry
customerPortalRouter.get("/dashboard-layout", async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const layout = await CustomerPortalService.getDashboardLayout(userId);
    res.json(layout);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load the dashboard layout.");
  }
});

customerPortalRouter.put("/dashboard-layout", async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const { layoutJson } = req.body;
    const updated = await CustomerPortalService.saveDashboardLayout(userId, layoutJson);
    res.json(updated);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to save the dashboard layout.");
  }
});

customerPortalRouter.get("/dashboard-metrics", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedTenant(req);
    if (!tenantId) {
      return res.status(400).json({ error: "A tenant-scoped customer is required.", code: "TENANT_REQUIRED" });
    }
    const now = new Date();
    const [activeSubscriptions, ordersCount, appointmentsCount, outstandingInvoices, ticketsCount, documentsCount, reviews] =
      await Promise.all([
        prisma.subscription.count({ where: { tenantId, status: { in: ["ACTIVE", "TRIAL"] } } }),
        prisma.customerOrder.count({ where: { tenantId } }),
        prisma.customerAppointment.count({
          where: { tenantId, appointmentTime: { gte: now }, status: { not: "CANCELLED" } },
        }),
        prisma.invoice.findMany({
          where: { tenantId, status: { in: ["OPEN", "UNPAID", "OVERDUE", "PAST_DUE"] } },
          select: { amount: true, currency: true },
        }),
        prisma.ticket.count({ where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
        prisma.customerDocument.count({ where: { tenantId } }),
        prisma.review.aggregate({
          where: { location: { tenantId } },
          _count: { _all: true },
          _avg: { starRating: true },
        }),
      ]);

    const currencies = new Set(outstandingInvoices.map((invoice) => invoice.currency));
    const unpaidInvoicesTotal = currencies.size <= 1
      ? outstandingInvoices.reduce((total, invoice) => total + invoice.amount, 0)
      : null;

    return res.json({
      source: "TENANT_DATABASE",
      activeServicesCount: activeSubscriptions,
      ordersCount,
      upcomingAppointmentsCount: appointmentsCount,
      unpaidInvoicesTotal,
      unpaidInvoicesCurrency: currencies.size === 1 ? outstandingInvoices[0]?.currency || null : null,
      openTicketsCount: ticketsCount,
      loyaltyPoints: null,
      loyaltyTier: null,
      documentsCount,
      marketingHealthScore: null,
      googleRating: reviews._avg.starRating,
      reviewsCount: reviews._count._all,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Profile & Account
customerPortalRouter.get("/profile", async (req: Request, res: Response) => {
  try {
    const { clientId } = getContext(req);
    const profile = await CustomerPortalService.getProfile(clientId);
    res.json(profile);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load the customer profile.");
  }
});

customerPortalRouter.put("/profile", async (req: Request, res: Response) => {
  try {
    const { clientId } = getContext(req);
    const updated = await CustomerPortalService.updateProfile(clientId, req.body);
    res.json(updated);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to update the customer profile.");
  }
});

// 3. Subscribed Services
customerPortalRouter.get("/services", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const services = await CustomerPortalService.getServices(tenantId);
    res.json(services);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load subscribed services.");
  }
});

customerPortalRouter.post("/services/request", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { serviceId, action } = req.body;
    const result = await CustomerPortalService.requestServiceChange(tenantId, serviceId, action);
    res.json(result);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to request a service change.");
  }
});

// 4. Orders & Tracking
customerPortalRouter.get("/orders", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const orders = await CustomerPortalService.getOrders(tenantId, clientId);
    res.json({ orders });
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load customer orders.");
  }
});

customerPortalRouter.post("/orders", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const { items, total } = req.body;
    const order = await CustomerPortalService.createOrder(tenantId, clientId, items, total);
    res.status(201).json(order);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to create the customer order.");
  }
});

// 5. Appointments & Booking
customerPortalRouter.get("/appointments", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const appointments = await CustomerPortalService.getAppointments(tenantId, clientId);
    res.json({ appointments });
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load customer appointments.");
  }
});

customerPortalRouter.post("/appointments", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const appointment = await CustomerPortalService.bookAppointment(tenantId, clientId, req.body);
    res.status(201).json(appointment);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to book the customer appointment.");
  }
});

// 6. Google Business Profile Customer Actions
customerPortalRouter.get("/gbp", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const gbp = await CustomerPortalService.getGbpData(tenantId);
    res.json(gbp);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load Google Business Profile data.");
  }
});

customerPortalRouter.post("/gbp/reviews", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { locationId, starRating, comment } = req.body;
    const review = await CustomerPortalService.submitReview(tenantId, locationId, starRating, comment);
    res.status(201).json(review);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to submit the Google review.");
  }
});

// 7. Omnichannel Messages
customerPortalRouter.get("/messages", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const messages = await CustomerPortalService.getMessages(tenantId, clientId);
    res.json({ messages });
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load customer messages.");
  }
});

customerPortalRouter.post("/messages", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const { content, channel } = req.body;
    const msg = await CustomerPortalService.sendMessage(tenantId, clientId, content, channel);
    res.status(201).json(msg);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to send the customer message.");
  }
});

// 8. Support Center
customerPortalRouter.get("/support", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const support = await CustomerPortalService.getSupportData(tenantId);
    res.json(support);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load customer support data.");
  }
});

customerPortalRouter.post("/support/tickets", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const { subject, description, priority } = req.body;
    const ticket = await CustomerPortalService.createSupportTicket(tenantId, clientId, subject, description, priority);
    res.status(201).json(ticket);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to create the support ticket.");
  }
});

// 9. AI Assistant Studio (7 Customer Tools)
customerPortalRouter.post("/ai/assistant", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const { toolType, query } = req.body;
    const aiResponse = await CustomerPortalService.generateAiAssistantResponse(tenantId, toolType, query);
    res.json(aiResponse);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to run the customer AI assistant.");
  }
});

// 10. Document Vault
customerPortalRouter.get("/documents", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const documents = await CustomerPortalService.getDocuments(tenantId, clientId);
    res.json({ documents });
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load customer documents.");
  }
});

customerPortalRouter.post("/documents/upload", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const doc = await CustomerPortalService.uploadDocument(tenantId, clientId, req.body);
    res.status(201).json(doc);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to save document metadata.");
  }
});

// 11. Payments & Invoices
customerPortalRouter.get("/payments", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedTenant(req);
    if (!tenantId) {
      return res.status(400).json({ error: "A tenant-scoped customer is required.", code: "TENANT_REQUIRED" });
    }
    const [invoices, defaultPaymentMethod, configuredGateways] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId },
        include: { payments: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.savedPaymentMethod.findFirst({
        where: { tenantId, isDefault: true },
        select: { id: true, gateway: true, paymentType: true, cardBrand: true, last4: true, expMonth: true, expYear: true },
      }),
      prisma.paymentGatewayConfig.count({ where: { isEnabled: true } }),
    ]);

    return res.json({
      source: "BILLING_LEDGER",
      invoices,
      autoPaymentEnabled: Boolean(defaultPaymentMethod),
      defaultPaymentMethod,
      history: invoices.flatMap((invoice) => invoice.payments.map((payment) => ({ ...payment, invoiceNumber: invoice.invoiceNumber }))),
      paymentGatewayConfigured: configuredGateways > 0,
      paymentActionAvailable: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

customerPortalRouter.post("/payments/pay", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getAuthenticatedTenant(req);
    const { invoiceId } = req.body || {};
    if (!tenantId || !invoiceId) {
      return res.status(400).json({ error: "Tenant and invoice are required." });
    }
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found." });

    return res.status(501).json({
      error: "Online payment collection is not enabled through this endpoint. Configure and verify a live gateway adapter before collecting payment.",
      code: "PAYMENT_PROVIDER_ADAPTER_REQUIRED",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Customer Reports (7 Domains)
customerPortalRouter.get("/reports", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const reports = await CustomerPortalService.getCustomerReports(tenantId);
    res.json(reports);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load customer reports.");
  }
});

// 13. Notifications Preferences
customerPortalRouter.get("/notifications/preferences", async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const prefs = await CustomerPortalService.getNotificationPreferences(userId);
    res.json({ preferences: prefs });
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load notification preferences.");
  }
});

customerPortalRouter.put("/notifications/preferences", async (req: Request, res: Response) => {
  try {
    const { userId } = getContext(req);
    const updated = await CustomerPortalService.updateNotificationPreferences(userId, req.body);
    res.json(updated);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to update notification preferences.");
  }
});

// 14. Enterprise Global Search
customerPortalRouter.get("/global-search", async (req: Request, res: Response) => {
  try {
    const { tenantId, clientId } = getContext(req);
    const q = (req.query.q as string) || "";
    const results = await CustomerPortalService.globalSearch(tenantId, clientId, q);
    res.json(results);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to search customer resources.");
  }
});

// 15. Workflows
customerPortalRouter.get("/workflows", async (req: Request, res: Response) => {
  try {
    const { tenantId } = getContext(req);
    const workflows = await CustomerPortalService.getWorkflows(tenantId);
    res.json(workflows);
  } catch (error: unknown) {
    return sendCustomerPortalError(res, error, "Failed to load customer workflows.");
  }
});
