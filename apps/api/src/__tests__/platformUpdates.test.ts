import request from "supertest";
import { app } from "../index";

describe("GBS Platform Master Updates & Universal Requirements Test Suite", () => {
  let authToken: string;
  let testTenantId: string;

  beforeAll(async () => {
    process.env.TEST_SSO_BYPASS = "true";
    const { prisma } = await import("@saas/database");
    
    // Provision super admin test user in DB for RBAC tests
    let user = await prisma.user.findFirst({ where: { email: "admin@saas.com" } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "admin@saas.com",
          firstName: "Admin",
          lastName: "User",
          isActive: true,
        },
      });
    }

    // Ensure system Super Admin role exists
    let role = await prisma.role.findFirst({ where: { isSystem: true } });
    if (!role) {
      role = await prisma.role.create({
        data: { name: "Super Admin", isSystem: true },
      });
    }

    try {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    } catch (_e) {}

    const jwt = require("jsonwebtoken");
    authToken = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenantId || "demo-tenant-id" },
      process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately",
      { expiresIn: "1h" }
    );
    testTenantId = user.tenantId || "demo-tenant-id";
  });

  // =========================================================================
  // 1. CUSTOMER AUTHENTICATION & LOGIN POLICIES
  // =========================================================================
  describe("1. Customer Authentication (Mobile OTP, SSO, Passkeys)", () => {
    it("should send Mobile SMS OTP", async () => {
      const res = await request(app)
        .post("/api/v1/auth/otp/send")
        .send({ identifier: "+15550001111", channel: "SMS" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.identifier).toBe("+15550001111");
    });

    it("should send WhatsApp OTP", async () => {
      const res = await request(app)
        .post("/api/v1/auth/otp/send")
        .send({ identifier: "+15550002222", channel: "WHATSAPP" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.channel).toBe("WHATSAPP");
    });

    it("should send Email OTP", async () => {
      const res = await request(app)
        .post("/api/v1/auth/otp/send")
        .send({ identifier: "otpuser@example.com", channel: "EMAIL" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should not bypass Apple SSO signature verification in test mode", async () => {
      const res = await request(app)
        .post("/api/v1/auth/apple-login")
        .send({ identityToken: "mock-apple-identity-token", user: { email: "appleuser@example.com" } });

      expect([401, 503]).toContain(res.status);
      expect(res.body.data?.token).toBeUndefined();
    });

    it("should handle Microsoft SSO Login", async () => {
      const res = await request(app)
        .post("/api/v1/auth/microsoft-login")
        .send({ accessToken: "mock-ms-token", email: "msuser@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    it("should handle GitHub SSO Login", async () => {
      const res = await request(app)
        .post("/api/v1/auth/github-login")
        .send({ code: "mock-gh-code", email: "ghuser@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    it("should respond to Passkeys registration challenge", async () => {
      const res = await request(app)
        .post("/api/v1/auth/passkeys/register")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.challenge).toBeDefined();
    });
  });

  // =========================================================================
  // 2. GOOGLE LOGIN & PROFILE DETECTION
  // =========================================================================
  describe("2. Google Login Profile Auto-Detection & Selection", () => {
    it("should auto-detect Google Business Profiles, Accounts, Orgs and Locations", async () => {
      const res = await request(app)
        .get("/api/v1/google/detect-profiles")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.autoDetected).toBe(true);
      expect(res.body.accounts.length).toBeGreaterThan(0);
    });

    it("should connect selected Google profiles", async () => {
      const res = await request(app)
        .post("/api/v1/google/select-profiles")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ selectedLocationIds: ["locations/8923019820192", "locations/7712391028312"] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.connectedCount).toBe(2);
    });
  });

  // =========================================================================
  // 3. BUSINESS PROFILE ACCESS CONTROL
  // =========================================================================
  describe("3. Business Profile Access Control", () => {
    it("should update profile feature access restrictions", async () => {
      const res = await request(app)
        .post("/api/v1/gbp/locations/loc-123/access-control")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          status: "APPROVED",
          isEditingRestricted: false,
          isReviewReplyRestricted: true,
          isPostingRestricted: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should perform bulk approval of profiles", async () => {
      const res = await request(app)
        .post("/api/v1/gbp/locations/bulk-approve")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ locationIds: ["loc-1", "loc-2", "loc-3"] });

      expect(res.status).toBe(200);
      expect(res.body.approvedCount).toBe(3);
    });

    it("should perform bulk revocation of profiles", async () => {
      const res = await request(app)
        .post("/api/v1/gbp/locations/bulk-revoke")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ locationIds: ["loc-4", "loc-5"], reason: "Policy violation" });

      expect(res.status).toBe(200);
      expect(res.body.revokedCount).toBe(2);
    });
  });

  // =========================================================================
  // 4. PARTNER CONTROL & SUBSCRIPTION LIMITS
  // =========================================================================
  describe("4. Partner Control & Admin Limit Overrides", () => {
    it("should allow partner to suspend customer profile", async () => {
      const res = await request(app)
        .post("/api/v1/partner/customers/client-99/action")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ action: "SUSPEND", reason: "Payment overdue" });

      expect(res.status).toBe(200);
      expect(res.body.newStatus).toBe("SUSPENDED");
    });

    it("should fetch customer audit activity history", async () => {
      const res = await request(app)
        .get("/api/v1/partner/customers/client-99/activity")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.activity).toBeDefined();
    });

    it("should allow admin to override tenant subscription limits", async () => {
      const res = await request(app)
        .post("/api/v1/admin/subscription-limits/override")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          targetTenantId: "tenant-enterprise-1",
          limits: { maxCustomers: 500, maxGoogleProfiles: 100, maxAiTokens: 5000000 },
          reason: "Enterprise SLA extension",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // =========================================================================
  // 5. BUSINESS DIRECTORY PLATFORM
  // =========================================================================
  describe("5. Unified Business Directory Management Platform", () => {
    it("should list all 17 directory platforms", async () => {
      const res = await request(app)
        .get("/api/v1/business-directory/platforms")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(17);
    });

    it("should connect a listing to Apple Business Connect", async () => {
      const res = await request(app)
        .post("/api/v1/business-directory/listings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          providerKey: "APPLE_BUSINESS",
          businessName: "GBS Flagship Apple Listing",
          phone: "+15559998888",
          websiteUrl: "https://gbs.example.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.businessName).toBe("GBS Flagship Apple Listing");
    });

    it("should trigger multi-directory synchronization", async () => {
      const res = await request(app)
        .post("/api/v1/business-directory/sync")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.syncedCount).toBeGreaterThanOrEqual(17);
    });
  });

  // =========================================================================
  // 6. WHATSAPP MARKETING & COMMUNICATION CENTER
  // =========================================================================
  describe("6. WhatsApp Marketing & Omnichannel Communication Center", () => {
    it("should create WhatsApp marketing campaign", async () => {
      const res = await request(app)
        .post("/api/v1/whatsapp-marketing/campaigns")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Q3 VIP WhatsApp Special",
          messageContent: "Exclusive 25% discount for VIP members! Reply YES to claim.",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Q3 VIP WhatsApp Special");
    });

    it("should fetch WhatsApp campaign analytics", async () => {
      const res = await request(app)
        .get("/api/v1/whatsapp-marketing/analytics")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.deliveryRate).toBeDefined();
      expect(res.body.data.openRate).toBeDefined();
    });

    it("should dispatch omnichannel message", async () => {
      const res = await request(app)
        .post("/api/v1/communication-center/send")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          channel: "WHATSAPP",
          recipient: "+15551112222",
          title: "Order Confirmation",
          body: "Your order #1004 has been confirmed!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("DELIVERED");
    });
  });

  // =========================================================================
  // 7. UNIFIED BUSINESS MANAGER & AI AUTOMATION
  // =========================================================================
  describe("7. Unified Business Manager & AI Automation Engine", () => {
    it("should fetch unified business manager dashboard", async () => {
      const res = await request(app)
        .get("/api/v1/unified-business-manager/dashboard")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.healthScore).toBeDefined();
    });

    it("should generate AI WhatsApp reply", async () => {
      const res = await request(app)
        .post("/api/v1/unified-business-manager/ai-replies/whatsapp")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ incomingMessage: "Are you open on Sundays?" });

      expect(res.status).toBe(200);
      expect(res.body.aiReply).toBeDefined();
    });

    it("should generate AI Review reply", async () => {
      const res = await request(app)
        .post("/api/v1/unified-business-manager/ai-replies/review")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reviewerName: "John Doe", starRating: 5, reviewText: "Amazing service and atmosphere!" });

      expect(res.status).toBe(200);
      expect(res.body.replyText).toContain("John Doe");
    });

    it("should run AI Lead Qualification", async () => {
      const res = await request(app)
        .post("/api/v1/unified-business-manager/ai-qualify-lead")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ email: "cto@enterprise.com", companyName: "Enterprise Corp", phone: "+15559990000", annualRevenue: 500000 });

      expect(res.status).toBe(200);
      expect(res.body.score).toBeGreaterThan(60);
      expect(res.body.qualificationStatus).toBe("HOT_QUALIFIED");
    });
  });
});
