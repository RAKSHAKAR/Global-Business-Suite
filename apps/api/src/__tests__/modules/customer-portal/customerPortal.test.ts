import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { prisma } from "@saas/database";
import { customerPortalRouter } from "../../../routes/v1/customerPortal";

const fixtureSuffix = `${process.pid}`;
const fixture = {
  tenantId: `customer_hardening_tenant_${fixtureSuffix}`,
  userId: `customer_hardening_user_${fixtureSuffix}`,
  clientId: `customer_hardening_client_${fixtureSuffix}`,
  roleId: `customer_hardening_role_${fixtureSuffix}`,
  planId: `customer_hardening_plan_${fixtureSuffix}`,
  email: `customer.hardening.${fixtureSuffix}@example.test`,
};

let authToken = "";
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.headers.authorization = `Bearer ${authToken}`;
  next();
});
app.use("/api/v1/customer", customerPortalRouter);

const cleanupFixture = async () => {
  await prisma.dashboardLayout.deleteMany({ where: { userId: fixture.userId } });
  await prisma.unifiedConversation.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.customerDocument.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.customerAppointment.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.customerOrder.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.customerLoyalty.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.scheduledReport.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.ticket.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.subscription.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.client.deleteMany({ where: { tenantId: fixture.tenantId } });
  await prisma.user.deleteMany({ where: { id: fixture.userId } });
  await prisma.role.deleteMany({ where: { id: fixture.roleId } });
  await prisma.tenant.deleteMany({ where: { id: fixture.tenantId } });
  await prisma.plan.deleteMany({ where: { id: fixture.planId } });
};

beforeAll(async () => {
  await cleanupFixture();
  await prisma.tenant.create({
    data: { id: fixture.tenantId, name: "Customer hardening fixture" },
  });
  await prisma.user.create({
    data: {
      id: fixture.userId,
      email: fixture.email,
      firstName: "Persisted",
      lastName: "Customer",
      tenantId: fixture.tenantId,
    },
  });
  await prisma.role.create({
    data: { id: fixture.roleId, name: "Customer", tenantId: fixture.tenantId },
  });
  await prisma.userRole.create({
    data: { userId: fixture.userId, roleId: fixture.roleId },
  });
  await prisma.client.create({
    data: {
      id: fixture.clientId,
      firstName: "Persisted",
      lastName: "Customer",
      email: fixture.email,
      tenantId: fixture.tenantId,
    },
  });
  await prisma.plan.create({
    data: {
      id: fixture.planId,
      name: `Persisted customer plan ${fixtureSuffix}`,
      price: 125,
      currency: "USD",
      interval: "MONTHLY",
    },
  });

  authToken = jwt.sign(
    { userId: fixture.userId, email: fixture.email },
    process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately",
    { expiresIn: "1h" },
  );
});

afterAll(cleanupFixture);

describe("customer portal persistence and capability boundaries", () => {
  it("returns an honest empty dashboard layout and persists an explicit layout", async () => {
    const empty = await request(app).get("/api/v1/customer/dashboard-layout");
    expect(empty.status).toBe(200);
    expect(empty.body).toMatchObject({ userId: fixture.userId, layoutJson: "[]", persisted: false });

    const widgets = [{ id: "active_services", visible: true, order: 1 }];
    const saved = await request(app)
      .put("/api/v1/customer/dashboard-layout")
      .send({ layoutJson: JSON.stringify(widgets) });
    expect(saved.status).toBe(200);
    expect(JSON.parse(saved.body.layoutJson)).toEqual(widgets);
    expect(await prisma.dashboardLayout.findUnique({ where: { userId: fixture.userId } })).not.toBeNull();
  });

  it("rejects invalid layout JSON with the typed route error", async () => {
    const response = await request(app)
      .put("/api/v1/customer/dashboard-layout")
      .send({ layoutJson: "not-json" });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_DASHBOARD_LAYOUT");
  });

  it("returns zero dashboard metrics rather than demo counts", async () => {
    const response = await request(app).get("/api/v1/customer/dashboard-metrics");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      source: "TENANT_DATABASE",
      activeServicesCount: 0,
      ordersCount: 0,
      upcomingAppointmentsCount: 0,
      openTicketsCount: 0,
      documentsCount: 0,
      marketingHealthScore: null,
      googleRating: null,
    });
  });

  it("returns and updates only the persisted customer profile", async () => {
    const profile = await request(app).get("/api/v1/customer/profile");
    expect(profile.status).toBe(200);
    expect(profile.body).toMatchObject({
      id: fixture.clientId,
      firstName: "Persisted",
      email: fixture.email,
      connectedDevices: [],
      loginHistory: [],
    });
    expect(profile.body.email).not.toBe("alice@enterprise.com");

    const updated = await request(app)
      .put("/api/v1/customer/profile")
      .send({ firstName: "DatabaseUpdated", phone: "+1 555 0100" });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ firstName: "DatabaseUpdated", phone: "+1 555 0100" });
    expect((await prisma.client.findUnique({ where: { id: fixture.clientId } }))?.firstName).toBe("DatabaseUpdated");
  });

  it("returns persisted plans and never reports a fake service-change success", async () => {
    const services = await request(app).get("/api/v1/customer/services");
    expect(services.status).toBe(200);
    expect(services.body.purchasedServices).toEqual([]);
    expect(services.body.upgradesAvailable).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: fixture.planId, price: 125 })]),
    );

    const change = await request(app)
      .post("/api/v1/customer/services/request")
      .send({ serviceId: fixture.planId, action: "UPGRADE" });
    expect(change.status).toBe(501);
    expect(change.body.code).toBe("SERVICE_CHANGE_WORKFLOW_NOT_IMPLEMENTED");
    expect(change.body).not.toHaveProperty("status", "SUBMITTED");
  });

  it("returns empty order history, then returns the actual unpaid order write", async () => {
    const empty = await request(app).get("/api/v1/customer/orders");
    expect(empty.status).toBe(200);
    expect(empty.body.orders).toEqual([]);

    const created = await request(app)
      .post("/api/v1/customer/orders")
      .send({ items: [{ name: "Persisted item", quantity: 1 }], total: 99 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      tenantId: fixture.tenantId,
      clientId: fixture.clientId,
      total: 99,
      status: "PENDING",
      paymentStatus: "UNPAID",
    });
    expect(await prisma.customerOrder.findUnique({ where: { id: created.body.id } })).not.toBeNull();
  });

  it("persists appointments without inventing a meeting link", async () => {
    const empty = await request(app).get("/api/v1/customer/appointments");
    expect(empty.status).toBe(200);
    expect(empty.body.appointments).toEqual([]);

    const created = await request(app)
      .post("/api/v1/customer/appointments")
      .send({ title: "Persisted strategy session", appointmentTime: "2030-01-01T10:00:00.000Z" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ status: "BOOKED", meetingLink: null });
  });

  it("returns honest empty Google records and rejects fake Google review IDs", async () => {
    const gbp = await request(app).get("/api/v1/customer/gbp");
    expect(gbp.status).toBe(200);
    expect(gbp.body).toMatchObject({ locations: [], updates: [], faqs: [] });

    const review = await request(app)
      .post("/api/v1/customer/gbp/reviews")
      .send({ locationId: "missing-location", starRating: 5, comment: "Test" });
    expect(review.status).toBe(404);
    expect(review.body.code).toBe("GOOGLE_LOCATION_NOT_FOUND");
  });

  it("persists local live-chat messages and rejects unconfigured outbound channels", async () => {
    const empty = await request(app).get("/api/v1/customer/messages");
    expect(empty.status).toBe(200);
    expect(empty.body.messages).toEqual([]);

    const sent = await request(app)
      .post("/api/v1/customer/messages")
      .send({ content: "Persist this message", channel: "CHAT" });
    expect(sent.status).toBe(201);
    expect(sent.body).toMatchObject({ sender: "CUSTOMER", channel: "LIVE_CHAT", content: "Persist this message" });

    const messages = await request(app).get("/api/v1/customer/messages");
    expect(messages.body.messages).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: sent.body.id, content: "Persist this message" })]),
    );

    const whatsapp = await request(app)
      .post("/api/v1/customer/messages")
      .send({ content: "Do not pretend this was sent", channel: "WHATSAPP" });
    expect(whatsapp.status).toBe(501);
    expect(whatsapp.body.code).toBe("MESSAGE_PROVIDER_ADAPTER_REQUIRED");
  });

  it("persists the support ticket description as a real ticket message", async () => {
    const created = await request(app)
      .post("/api/v1/customer/support/tickets")
      .send({ subject: "Persisted billing inquiry", description: "Persist this exact description", priority: "HIGH" });
    expect(created.status).toBe(201);
    expect(created.body.messages).toEqual(
      expect.arrayContaining([expect.objectContaining({ content: "Persist this exact description" })]),
    );
  });

  it("returns 501 for the unconnected customer AI assistant", async () => {
    const response = await request(app)
      .post("/api/v1/customer/ai/assistant")
      .send({ toolType: "HELP", query: "How do I pay invoices?" });
    expect(response.status).toBe(501);
    expect(response.body.code).toBe("CUSTOMER_AI_ASSISTANT_NOT_IMPLEMENTED");
    expect(response.body).not.toHaveProperty("response");
  });

  it("returns empty documents, then returns only persisted document metadata", async () => {
    const empty = await request(app).get("/api/v1/customer/documents");
    expect(empty.status).toBe(200);
    expect(empty.body.documents).toEqual([]);

    const created = await request(app)
      .post("/api/v1/customer/documents/upload")
      .send({
        name: `CustomerHardeningReceipt-${fixtureSuffix}.pdf`,
        fileUrl: "https://storage.example.test/customer/receipt.pdf",
        fileSize: 2048,
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      tenantId: fixture.tenantId,
      clientId: fixture.clientId,
      fileSize: 2048,
      sharedBy: "CUSTOMER",
    });
  });

  it("returns real empty billing, reports, workflows, and notification state", async () => {
    const [payments, reports, workflows, preferences] = await Promise.all([
      request(app).get("/api/v1/customer/payments"),
      request(app).get("/api/v1/customer/reports"),
      request(app).get("/api/v1/customer/workflows"),
      request(app).get("/api/v1/customer/notifications/preferences"),
    ]);
    expect(payments.status).toBe(200);
    expect(payments.body).toMatchObject({ invoices: [], history: [], autoPaymentEnabled: false });
    expect(reports.body).toMatchObject({ domains: [], reports: [] });
    expect(workflows.body.activeWorkflows).toEqual([]);
    expect(preferences.body.preferences).toEqual({});
  });

  it("searches persisted customer resources and never injects canned results", async () => {
    const response = await request(app).get(`/api/v1/customer/global-search?q=CustomerHardeningReceipt-${fixtureSuffix}`);
    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([
      expect.objectContaining({ type: "DOCUMENT", title: `CustomerHardeningReceipt-${fixtureSuffix}.pdf` }),
    ]);

    const noMatch = await request(app).get("/api/v1/customer/global-search?q=ORD-9482");
    expect(noMatch.status).toBe(200);
    expect(noMatch.body.results).toEqual([]);
  });
});
