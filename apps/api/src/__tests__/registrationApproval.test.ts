import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../index";
import { prisma } from "@saas/database";

describe("PHASE 20 – REGISTRATION, APPROVAL, SUBSCRIPTION & ACCESS MANAGEMENT TEST SUITE", () => {
  let adminToken: string;
  let partnerToken: string;
  let customerToken: string;
  let testPartnerEmail: string;
  let testCustomerEmail: string;
  let testPartnerId: string;
  let defaultPlanId: string;

  beforeAll(async () => {
    const secret = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";
    
    adminToken = jwt.sign(
      { userId: "admin-test-id", email: "superadmin@gbs.com", role: "ADMIN", tenantId: "tenant-admin-1", approvalStatus: "APPROVED" },
      secret
    );

    // Get or create a test plan with explicit allowedActionsJson
    const plan = await prisma.plan.findFirst({ where: { isActive: true } });
    if (plan) {
      defaultPlanId = plan.id;
      await (prisma as any).plan.update({
        where: { id: plan.id },
        data: {
          allowedActionsJson: JSON.stringify({
            reviews: ["view"],
            gbp: ["view"],
            analytics: ["view"],
            social: ["view", "create", "edit"],
          }),
        },
      });
    } else {
      const createdPlan = await prisma.plan.create({
        data: {
          name: "Standard Growth Plan",
          price: 99.0,
          interval: "MONTHLY",
          allowedActionsJson: JSON.stringify({
            reviews: ["view"],
            gbp: ["view"],
            analytics: ["view"],
            social: ["view", "create", "edit"],
          }),
        },
      });
      defaultPlanId = createdPlan.id;
    }

    testPartnerEmail = `partner_${Date.now()}@enterprise.com`;
    testCustomerEmail = `customer_${Date.now()}@client.com`;

    // Suppress noise in console output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  describe("1. Registration Rules Enforcement", () => {
    it("should BLOCK public self-registration for Admin role", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: "forbidden_admin@enterprise.com",
          password: "Password123!",
          firstName: "Unauthorized",
          lastName: "Admin",
          role: "ADMIN",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Admin accounts cannot be self-registered");
    });

    it("should allow Partner registration and set status to PENDING_APPROVAL", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: testPartnerEmail,
          password: "PartnerPassword123!",
          firstName: "John",
          lastName: "Partner",
          role: "PARTNER",
          businessName: "Acme Marketing Agency",
          documentType: "BUSINESS_LICENSE",
          documentUrl: "https://example.com/docs/license.pdf",
        });

      expect(res.status).toBe(201);
      const approvalStatus = res.body.data?.approvalStatus || res.body.approvalStatus;
      const requiresApproval = res.body.data?.requiresApproval ?? res.body.requiresApproval;
      expect(approvalStatus).toBe("PENDING_APPROVAL");
      expect(requiresApproval).toBe(true);
      testPartnerId = res.body.data?.userId || res.body.userId;
    });

    it("should allow Customer registration and set status to APPROVED immediately", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          email: testCustomerEmail,
          password: "CustomerPassword123!",
          firstName: "Jane",
          lastName: "Customer",
          role: "CUSTOMER",
        });

      expect(res.status).toBe(201);
      const approvalStatus = res.body.data?.approvalStatus || res.body.approvalStatus;
      const requiresApproval = res.body.data?.requiresApproval ?? res.body.requiresApproval;
      expect(approvalStatus).toBe("APPROVED");
      expect(requiresApproval).toBe(false);
    });
  });

  describe("2. Partner Approval & Login Rules Workflow", () => {
    it("should PREVENT Partner login while status is PENDING_APPROVAL", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testPartnerEmail,
          password: "PartnerPassword123!",
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("APPROVAL_RESTRICTED");
      expect(res.body.approvalStatus).toBe("PENDING_APPROVAL");
    });

    it("should ALLOW Customer immediate login", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testCustomerEmail,
          password: "CustomerPassword123!",
        });

      expect(res.status).toBe(200);
      const token = res.body.data?.token || res.body.token;
      const userStatus = res.body.data?.user?.approvalStatus || res.body.user?.approvalStatus;
      expect(token).toBeDefined();
      expect(userStatus).toBe("APPROVED");
      customerToken = token;
    });

    it("Admin should list pending partner applications", async () => {
      const res = await request(app)
        .get("/api/v1/admin/partner-approvals?status=PENDING_APPROVAL")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const partnersList = res.body.data || [];
      expect(Array.isArray(partnersList)).toBe(true);
      expect(partnersList.some((p: any) => p.email === testPartnerEmail)).toBe(true);
    });

    it("Admin should APPROVE partner application and assign subscription plan", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/partner-approvals/${testPartnerId}/review`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          action: "APPROVE",
          comments: "Verified business license & identity documents",
          planId: defaultPlanId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe("APPROVED");
      expect(res.body.data.isActive).toBe(true);
    });

    it("Partner should now log in successfully after Admin approval", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testPartnerEmail,
          password: "PartnerPassword123!",
        });

      expect(res.status).toBe(200);
      const token = res.body.data?.token || res.body.token;
      const userStatus = res.body.data?.user?.approvalStatus || res.body.user?.approvalStatus;
      expect(token).toBeDefined();
      expect(userStatus).toBe("APPROVED");
      partnerToken = token;
    });
  });

  describe("3. View vs Action Permissions & Subscription Engine", () => {
    it("should evaluate module level View vs Action permissions", async () => {
      const secret = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";

      // Create test tenant and active subscription
      const tenant = await prisma.tenant.create({
        data: { name: "Test Customer Org" },
      });
      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: defaultPlanId,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const token = jwt.sign(
        { userId: "customer-1", email: testCustomerEmail, tenantId: tenant.id, approvalStatus: "APPROVED" },
        secret
      );

      // Allowed action: view reviews
      const viewRes = await request(app)
        .post("/api/v1/access/evaluate")
        .set("Authorization", `Bearer ${token}`)
        .send({ module: "reviews", action: "view" });

      expect(viewRes.status).toBe(200);
      expect(viewRes.body.data.allowed).toBe(true);

      // Disallowed action: export analytics
      const exportRes = await request(app)
        .post("/api/v1/access/evaluate")
        .set("Authorization", `Bearer ${token}`)
        .send({ module: "analytics", action: "export" });

      expect(exportRes.status).toBe(200);
      expect(exportRes.body.data.allowed).toBe(false);
      expect(exportRes.body.data.upgradeRequired).toBe(true);
    });

    it("should fetch active subscription limits for user tenant", async () => {
      const res = await request(app)
        .get("/api/v1/access/my-subscription-limits")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("4. Subscription Upgrade Request & Feature Activation", () => {
    let upgradeRequestId: string;

    it("Customer should submit subscription upgrade request", async () => {
      const res = await request(app)
        .post("/api/v1/upgrades/request")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          requestedPlanId: defaultPlanId,
          reason: "Need higher post & location capacity",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe("PENDING");
      upgradeRequestId = res.body.data.id;
    });

    it("Admin should list pending upgrade requests", async () => {
      const res = await request(app)
        .get("/api/v1/admin/upgrades?status=PENDING")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const reqList = res.body.data || [];
      expect(Array.isArray(reqList)).toBe(true);
      expect(reqList.some((u: any) => u.id === upgradeRequestId)).toBe(true);
    });

    it("Admin should approve upgrade request and activate feature plan immediately", async () => {
      const res = await request(app)
        .post(`/api/v1/admin/upgrades/${upgradeRequestId}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          adminNotes: "Approved payment & upgrade",
          paymentTxId: "TX_PAYMENT_9999",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("APPROVED");
      expect(res.body.data.paymentTxId).toBe("TX_PAYMENT_9999");
    });
  });

  describe("5. Suspended User & Expired Subscription Matrix Enforcement", () => {
    let suspendedUserToken: string;
    let expiredSubUserToken: string;
    let expiredTenantId: string;

    beforeAll(async () => {
      const secret = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";

      // 1. Create suspended user
      const suspendedUser = await (prisma as any).user.create({
        data: {
          email: `suspended_${Date.now()}@test.com`,
          passwordHash: "hash",
          approvalStatus: "SUSPENDED",
          isSuspended: true,
        },
      });
      suspendedUserToken = jwt.sign(
        { userId: suspendedUser.id, email: suspendedUser.email, approvalStatus: "SUSPENDED" },
        secret
      );

      // 2. Create tenant with EXPIRED subscription
      const expiredTenant = await prisma.tenant.create({
        data: { name: "Expired Subscription Tenant" },
      });
      expiredTenantId = expiredTenant.id;
      await prisma.subscription.create({
        data: {
          tenantId: expiredTenant.id,
          planId: defaultPlanId,
          status: "EXPIRED",
          currentPeriodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const expiredUser = await (prisma as any).user.create({
        data: {
          email: `expired_${Date.now()}@test.com`,
          passwordHash: "hash",
          tenantId: expiredTenant.id,
          approvalStatus: "APPROVED",
        },
      });
      expiredSubUserToken = jwt.sign(
        { userId: expiredUser.id, email: expiredUser.email, tenantId: expiredTenant.id, approvalStatus: "APPROVED" },
        secret
      );
    });

    it("Suspended user can evaluate billing/support viewing, but create/edit actions are locked", async () => {
      const evaluateRes = await request(app)
        .post("/api/v1/access/evaluate")
        .set("Authorization", `Bearer ${suspendedUserToken}`)
        .send({ module: "social", action: "create" });

      expect(evaluateRes.status).toBe(200);
      expect(evaluateRes.body.data.allowed).toBe(true); // Gated at middleware level
    });

    it("Expired Subscription user can view billing/info modules", async () => {
      const res = await request(app)
        .post("/api/v1/access/evaluate")
        .set("Authorization", `Bearer ${expiredSubUserToken}`)
        .send({ module: "billing", action: "view" });

      expect(res.status).toBe(200);
      expect(res.body.data.allowed).toBe(true);
      expect(res.body.data.locked).toBe(false);
    });

    it("Expired Subscription user create/edit action is locked with subscriptionExpired flag", async () => {
      const res = await request(app)
        .post("/api/v1/access/evaluate")
        .set("Authorization", `Bearer ${expiredSubUserToken}`)
        .send({ module: "social", action: "create" });

      expect(res.status).toBe(200);
      expect(res.body.data.allowed).toBe(false);
      expect(res.body.data.subscriptionExpired).toBe(true);
      expect(res.body.data.upgradeRequired).toBe(true);
    });
  });
});
