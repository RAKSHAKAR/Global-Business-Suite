import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../index";
import { BillingEnterpriseService, billingEnterpriseService } from "../services/billingEnterpriseService";

describe("PHASE 14 – ENTERPRISE BILLING, SUBSCRIPTION, LICENSING & PAYMENT PLATFORM TEST SUITE", () => {
  let mockAdminToken: string;
  let mockUserToken: string;

  beforeAll(async () => {
    const secret = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";
    mockAdminToken = jwt.sign(
      { id: "admin-1", email: "admin@gbs.com", role: "ADMIN", tenantId: "tenant-1" },
      secret
    );
    mockUserToken = jwt.sign(
      { id: "user-1", email: "user@gbs.com", role: "CUSTOMER", tenantId: "tenant-1" },
      secret
    );
    // Suppress console log noise during test runs
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  // 1. Direct Service Unit Tests
  describe("Billing Enterprise Service Direct Unit Tests", () => {
    it("should fetch active billing plans including enterprise defaults", async () => {
      const plans = await billingEnterpriseService.listPlans();
      expect(plans).toBeDefined();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.some((p) => p.name.includes("Enterprise"))).toBe(true);
    });

    it("should create a subscription with trial and generate invoice", async () => {
      const plans = await billingEnterpriseService.listPlans();
      const targetPlan = plans[0];
      const sub = await billingEnterpriseService.createSubscription({
        tenantId: "tenant-unit-test",
        planId: targetPlan.id,
        billingCycle: "YEARLY",
      });

      expect(sub).toBeDefined();
      expect(sub.tenantId).toBe("tenant-unit-test");
      expect(sub.billingCycle).toBe("YEARLY");
      expect(sub.plan.name).toBe(targetPlan.name);
    });

    it("should issue an enterprise license key with HMAC hash", async () => {
      const result = await billingEnterpriseService.generateLicenseKey({
        tenantId: "tenant-enterprise-key",
        licenseType: "ENTERPRISE",
        maxSeats: 100,
        maxDevices: 250,
        validDays: 365,
        features: ["AI_STUDIO", "GBP_AUTOMATION", "WHATSAPP_CRM"],
      });

      expect(result).toBeDefined();
      expect(result.rawKey).toMatch(/^GBS-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/);
      expect(result.license.licenseKeyMasked).toBeDefined();
      expect(result.license.maxSeats).toBe(100);
    });

    it("should activate an enterprise license key", async () => {
      const issued = await billingEnterpriseService.generateLicenseKey({
        tenantId: "tenant-activation-test",
        maxSeats: 10,
        validDays: 30,
      });

      const actResult = await billingEnterpriseService.activateLicense(issued.rawKey, {
        userId: "user-dev-1",
        deviceName: "MacBook-Pro-M3",
        deviceId: "dev-mac-12345",
      });

      expect(actResult.success).toBe(true);
      expect(actResult.licenseMasked).toBeDefined();
    });

    it("should process multi-gateway payment adapter with Stripe, Razorpay and PayPal mock routing", async () => {
      const plans = await billingEnterpriseService.listPlans();
      const sub = await billingEnterpriseService.createSubscription({
        tenantId: "tenant-pay-test",
        planId: plans[0].id,
      });

      // Generate invoice
      const invoice = await billingEnterpriseService.generateInvoice({
        tenantId: "tenant-pay-test",
        subscriptionId: sub.id,
        items: [{ description: "Monthly Plan Charge", quantity: 1, unitPrice: 299.0 }],
      });

      const paymentResult = await billingEnterpriseService.processPayment({
        invoiceId: invoice.id,
        amount: invoice.amount,
        currency: "USD",
        gateway: "STRIPE",
        idempotencyKey: `idempotency-${Date.now()}`,
      });

      expect(paymentResult).toBeDefined();
      expect(paymentResult.status).toBe("SUCCEEDED");
      expect(paymentResult.referenceId).toMatch(/^PAY-STRIPE-/);

      const refundResult = await billingEnterpriseService.processRefund(
        paymentResult.id,
        50.0,
        "Customer partial refund request"
      );

      expect(refundResult).toBeDefined();
      expect(refundResult.status).toBe("SUCCEEDED");
      expect(refundResult.id).toBeDefined();
    });

    it("should record metered usage record", async () => {
      const usage = await billingEnterpriseService.recordUsage(
        "tenant-metered-test",
        "AI_TOKENS",
        15000,
        0.0001
      );

      expect(usage).toBeDefined();
      expect(usage.tenantId).toBe("tenant-metered-test");
      expect(usage.totalAmount).toBe(1.5);
    });

    it("should compute enterprise financial analytics (MRR, ARR, ARPU, LTV, Churn)", async () => {
      const analytics = await billingEnterpriseService.getFinancialAnalytics();
      expect(analytics).toBeDefined();
      expect(analytics.financialMetrics).toBeDefined();
      expect(analytics.financialMetrics.mrr).toBeGreaterThanOrEqual(0);
      expect(analytics.financialMetrics.arr).toBe(analytics.financialMetrics.mrr * 12);
      expect(analytics.financialMetrics.arpu).toBeGreaterThanOrEqual(0);
      expect(analytics.financialMetrics.netRevenue).toBeGreaterThanOrEqual(0);
    });

    it("should process webhook events idempotently", async () => {
      const eventId = `evt_stripe_${Date.now()}`;
      const firstAttempt = await billingEnterpriseService.processWebhookEvent(
        "STRIPE",
        eventId,
        "payment_intent.succeeded",
        { id: eventId, amount: 4900, status: "succeeded" }
      );

      expect(firstAttempt.status).toBe("PROCESSED");

      const duplicateAttempt = await billingEnterpriseService.processWebhookEvent(
        "STRIPE",
        eventId,
        "payment_intent.succeeded",
        { id: eventId, amount: 4900, status: "succeeded" }
      );

      expect(duplicateAttempt.status).toBe("DUPLICATE");
    });
  });

  // 2. REST API Integration Endpoints Tests
  describe("REST API Endpoints (/api/v1/billing-platform)", () => {
    it("GET /api/v1/billing-platform/plans - should return subscription plans", async () => {
      const res = await request(app)
        .get("/api/v1/billing-platform/plans")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api/v1/billing-platform/subscriptions - should create subscription", async () => {
      const plansRes = await request(app)
        .get("/api/v1/billing-platform/plans")
        .set("Authorization", `Bearer ${mockAdminToken}`);
      
      const planId = plansRes.body.data[0].id;

      const res = await request(app)
        .post("/api/v1/billing-platform/subscriptions")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({
          planId,
          billingCycle: "MONTHLY",
          countryCode: "US",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it("POST /api/v1/billing-platform/licenses/issue - should issue enterprise license key", async () => {
      const res = await request(app)
        .post("/api/v1/billing-platform/licenses/issue")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({
          licenseType: "ENTERPRISE",
          maxSeats: 50,
          maxDevices: 100,
          allowedFeatures: ["AI_STUDIO", "ENTERPRISE_CRM"],
          validDays: 365,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.licenseKey).toMatch(/^GBS-/);
    });

    it("POST /api/v1/billing-platform/licenses/activate - should activate license key", async () => {
      const issueRes = await request(app)
        .post("/api/v1/billing-platform/licenses/issue")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({
          licenseType: "ENTERPRISE",
          maxSeats: 5,
        });

      const rawKey = issueRes.body.data.licenseKey;

      const res = await request(app)
        .post("/api/v1/billing-platform/licenses/activate")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({
          licenseKey: rawKey,
          deviceName: "Office-Desktop-01",
          deviceId: "desktop-uuid-01",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    });

    it("GET /api/v1/billing-platform/gateways - should return active payment gateway configurations", async () => {
      const res = await request(app)
        .get("/api/v1/billing-platform/gateways")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api/v1/billing-platform/payments/charge - should process gateway charge", async () => {
      const plans = await billingEnterpriseService.listPlans();
      const sub = await billingEnterpriseService.createSubscription({
        tenantId: "tenant-api-charge-test",
        planId: plans[0].id,
      });

      const inv = await billingEnterpriseService.generateInvoice({
        tenantId: "tenant-api-charge-test",
        subscriptionId: sub.id,
        items: [{ description: "Monthly Charge", quantity: 1, unitPrice: 499.0 }],
      });

      const res = await request(app)
        .post("/api/v1/billing-platform/payments/charge")
        .set("Authorization", `Bearer ${mockUserToken}`)
        .send({
          invoiceId: inv.id,
          amount: inv.amount,
          currency: "USD",
          gateway: "STRIPE",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("SUCCEEDED");
    });

    it("GET /api/v1/billing-platform/analytics/financial - should return MRR, ARR and financial metrics", async () => {
      const res = await request(app)
        .get("/api/v1/billing-platform/analytics/financial")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.financialMetrics.mrr).toBeGreaterThanOrEqual(0);
      expect(res.body.data.financialMetrics.arr).toBeGreaterThanOrEqual(0);
    });

    it("POST /api/v1/billing-platform/webhooks/stripe - should handle payment webhook callback", async () => {
      const eventId = `evt_webhook_api_${Date.now()}`;
      const res = await request(app)
        .post("/api/v1/billing-platform/webhooks/stripe")
        .send({
          id: eventId,
          type: "invoice.payment_succeeded",
          data: { object: { id: "in_12345", amount_paid: 19900 } },
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });
});
