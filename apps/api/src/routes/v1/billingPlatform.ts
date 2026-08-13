import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { BillingEnterpriseService } from "../../services/billingEnterpriseService";

export const billingPlatformRouter = Router();

// ============================================================================
// 1. PLANS & PRICING MANAGEMENT
// ============================================================================
billingPlatformRouter.get("/plans", async (_req: Request, res: Response) => {
  try {
    const plans = await BillingEnterpriseService.listPlans();
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch plans", details: error.message });
  }
});

billingPlatformRouter.post("/plans", authMiddleware, async (req: Request, res: Response) => {
  try {
    const plan = await BillingEnterpriseService.createPlan(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Failed to create plan", details: error.message });
  }
});

// ============================================================================
// 2. SUBSCRIPTION LIFECYCLE
// ============================================================================
billingPlatformRouter.post("/subscriptions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || req.body.tenantId;
    if (!tenantId) return res.status(400).json({ success: false, error: "Tenant ID required" });

    const subscription = await BillingEnterpriseService.createSubscription({
      tenantId,
      planId: req.body.planId,
      billingCycle: req.body.billingCycle,
      customPrice: req.body.customPrice,
      trialDays: req.body.trialDays,
      addons: req.body.addons,
    });
    res.status(201).json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Failed to create subscription", details: error.message });
  }
});

billingPlatformRouter.post("/subscriptions/:id/upgrade", authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await BillingEnterpriseService.upgradeSubscription(req.params.id, req.body.newPlanId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Subscription upgrade failed", details: error.message });
  }
});

billingPlatformRouter.post("/subscriptions/:id/pause", authMiddleware, async (req: Request, res: Response) => {
  try {
    const subscription = await BillingEnterpriseService.pauseSubscription(req.params.id);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Pause subscription failed", details: error.message });
  }
});

billingPlatformRouter.post("/subscriptions/:id/resume", authMiddleware, async (req: Request, res: Response) => {
  try {
    const subscription = await BillingEnterpriseService.resumeSubscription(req.params.id);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Resume subscription failed", details: error.message });
  }
});

billingPlatformRouter.post("/subscriptions/:id/cancel", authMiddleware, async (req: Request, res: Response) => {
  try {
    const subscription = await BillingEnterpriseService.cancelSubscription(req.params.id, req.body.immediate);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Cancel subscription failed", details: error.message });
  }
});

// ============================================================================
// 3. ENTERPRISE LICENSING
// ============================================================================
billingPlatformRouter.post("/licenses/generate", authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await BillingEnterpriseService.generateLicenseKey(req.body);
    res.status(201).json({ success: true, data: { ...result.license, licenseKey: result.rawKey } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "License key generation failed", details: error.message });
  }
});

billingPlatformRouter.post("/licenses/issue", authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await BillingEnterpriseService.generateLicenseKey(req.body);
    res.status(201).json({ success: true, data: { ...result.license, licenseKey: result.rawKey } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "License key generation failed", details: error.message });
  }
});

billingPlatformRouter.post("/licenses/activate", async (req: Request, res: Response) => {
  try {
    const { licenseKey, userId, deviceId, deviceName } = req.body;
    if (!licenseKey) return res.status(400).json({ success: false, error: "License Key is required" });

    const result = await BillingEnterpriseService.activateLicense(licenseKey, {
      userId,
      deviceId,
      deviceName,
      ipAddress: req.ip,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "License activation failed", details: error.message });
  }
});

billingPlatformRouter.post("/licenses/:id/revoke", authMiddleware, async (req: Request, res: Response) => {
  try {
    const license = await BillingEnterpriseService.revokeLicense(req.params.id, req.body.reason);
    res.json({ success: true, data: license });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "License revocation failed", details: error.message });
  }
});

// ============================================================================
// 4. PAYMENTS, REFUNDS & GATEWAYS
// ============================================================================
billingPlatformRouter.get("/gateways", async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: "STRIPE", name: "Stripe", isEnabled: true },
      { id: "RAZORPAY", name: "Razorpay", isEnabled: true },
      { id: "PAYPAL", name: "PayPal", isEnabled: true },
      { id: "SQUARE", name: "Square", isEnabled: true },
      { id: "AUTHORIZE_NET", name: "Authorize.Net", isEnabled: true },
      { id: "ADYEN", name: "Adyen", isEnabled: true },
      { id: "BRAINTREE", name: "Braintree", isEnabled: true },
      { id: "WORLDPAY", name: "Worldpay", isEnabled: true },
      { id: "PAYU", name: "PayU", isEnabled: true },
      { id: "PHONEPE", name: "PhonePe", isEnabled: true },
      { id: "GOOGLE_PAY", name: "Google Pay", isEnabled: true },
      { id: "APPLE_PAY", name: "Apple Pay", isEnabled: true },
      { id: "UPI", name: "UPI Direct", isEnabled: true },
      { id: "MANUAL", name: "Manual Bank Wire", isEnabled: true },
    ],
  });
});

billingPlatformRouter.post("/payments", authMiddleware, async (req: Request, res: Response) => {
  try {
    const payment = await BillingEnterpriseService.processPayment({
      invoiceId: req.body.invoiceId,
      amount: parseFloat(req.body.amount),
      currency: req.body.currency,
      gateway: req.body.gateway || "STRIPE",
      paymentType: req.body.paymentType,
      idempotencyKey: req.body.idempotencyKey,
    });
    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Payment processing failed", details: error.message });
  }
});

billingPlatformRouter.post("/payments/charge", authMiddleware, async (req: Request, res: Response) => {
  try {
    const payment = await BillingEnterpriseService.processPayment({
      invoiceId: req.body.invoiceId,
      amount: parseFloat(req.body.amount),
      currency: req.body.currency,
      gateway: req.body.gateway || "STRIPE",
      paymentType: req.body.paymentType,
      idempotencyKey: req.body.idempotencyKey,
    });
    res.status(200).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Payment processing failed", details: error.message });
  }
});

billingPlatformRouter.post("/payments/:id/refund", authMiddleware, async (req: Request, res: Response) => {
  try {
    const refund = await BillingEnterpriseService.processRefund(req.params.id, parseFloat(req.body.amount), req.body.reason);
    res.json({ success: true, data: refund });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Refund processing failed", details: error.message });
  }
});

// ============================================================================
// 5. INVOICING & METERED USAGE
// ============================================================================
billingPlatformRouter.post("/invoices", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || req.body.tenantId;
    const invoice = await BillingEnterpriseService.generateInvoice({
      tenantId,
      subscriptionId: req.body.subscriptionId,
      docType: req.body.docType,
      items: req.body.items,
      currency: req.body.currency,
      countryCode: req.body.countryCode,
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Failed to generate invoice", details: error.message });
  }
});

billingPlatformRouter.post("/usage", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || req.body.tenantId;
    const record = await BillingEnterpriseService.recordUsage(tenantId, req.body.metricKey, req.body.quantity, req.body.unitPrice);
    res.status(201).json({ success: true, data: record });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Recording usage failed", details: error.message });
  }
});

// ============================================================================
// 6. FINANCIAL ANALYTICS & WEBHOOKS
// ============================================================================
billingPlatformRouter.get("/reports", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const report = await BillingEnterpriseService.getFinancialAnalytics();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch financial reports", details: error.message });
  }
});

billingPlatformRouter.get("/analytics/financial", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const report = await BillingEnterpriseService.getFinancialAnalytics();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Failed to fetch financial reports", details: error.message });
  }
});

billingPlatformRouter.post("/webhooks/:gateway", async (req: Request, res: Response) => {
  try {
    const gateway = req.params.gateway.toUpperCase();
    const eventId = req.headers["x-webhook-id"] as string || `EVT-${Date.now()}`;
    const eventType = req.body.type || "PAYMENT_INTENT_SUCCEEDED";

    const result = await BillingEnterpriseService.processWebhookEvent(gateway, eventId, eventType, req.body);
    res.json({ received: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: "Webhook processing failed", details: error.message });
  }
});
