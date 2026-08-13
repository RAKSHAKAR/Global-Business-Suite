import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../index";
import { prisma } from "@saas/database";
import { publishToChannel, validateChannelHealth, type SocialChannelCredentials } from "../../services/socialPublisher";
import { SocialEngagementService } from "../../services/socialEngagementService";
import { SocialListeningService } from "../../services/socialListeningService";
import { SocialAiStudioService } from "../../services/socialAiStudioService";
import { SocialContentPackageService } from "../../services/socialContentPackageService";
import { permissionCache } from "../../services/permissionCacheService";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";

describe("Phase 11 — Enterprise Social Media Management & Marketing Automation", () => {
  let mockTenantId: string;
  let mockUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test tenant and user
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Social Enterprise Tenant",
        subdomain: `test-social-${Date.now()}`,
      },
    });
    mockTenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: `social-admin-${Date.now()}@tenant.com`,
        firstName: "Social",
        lastName: "Admin",
        tenantId: mockTenantId,
      },
    });
    mockUserId = user.id;

    const role = await prisma.role.create({
      data: { name: `Social Owner ${Date.now()}`, tenantId: mockTenantId },
    });
    for (const action of ["create", "read", "approve", "publish"]) {
      const permission = await prisma.permission.upsert({
        where: { resource_action: { resource: "social", action } },
        update: {},
        create: { resource: "social", action, description: `${action} social content` },
      });
      await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
    await prisma.userRole.create({ data: { userId: mockUserId, roleId: role.id } });
    await permissionCache.invalidate(mockUserId);

    // Generate valid JWT token for auth middleware
    authToken = jwt.sign(
      { userId: mockUserId, tenantId: mockTenantId, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    // Clean up test data gracefully
    try {
      await prisma.socialPostPlatformResult.deleteMany({ where: { post: { tenantId: mockTenantId } } });
      await prisma.socialPostVersion.deleteMany({ where: { post: { tenantId: mockTenantId } } });
      await prisma.approvalRequest.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.approvalStep.deleteMany({ where: { workflow: { tenantId: mockTenantId } } });
      await prisma.approvalWorkflow.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.socialPost.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.socialChannel.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.socialMessage.deleteMany({ where: { inbox: { tenantId: mockTenantId } } });
      await prisma.socialEngagementInbox.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.socialComment.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.socialMention.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.socialCompetitor.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.socialListeningMonitor.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.socialMediaAsset.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.aiContent.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.client.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.role.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.user.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.tenant.deleteMany({ where: { id: mockTenantId } });
    } catch (e) {
      console.warn("Cleanup warning:", e);
    }
  });

  // 1. Social Publisher Engine Tests (13+ platforms)
  describe("Multi-Platform Social Publisher Engine", () => {
    it("dispatches every known platform without reporting provider rejection as success", async () => {
      const platforms = [
        "FACEBOOK", "INSTAGRAM", "LINKEDIN", "TWITTER_X", "PINTEREST",
        "TIKTOK", "THREADS", "YOUTUBE", "GOOGLE_BUSINESS", "REDDIT",
        "TELEGRAM", "WHATSAPP", "SNAPCHAT"
      ] as const;

      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        json: async () => ({ error: { message: "Rejected test credential" } }),
        text: async () => "Rejected test credential",
        arrayBuffer: async () => new ArrayBuffer(0),
      } as Response);

      try {
        for (const platform of platforms) {
          const channel: SocialChannelCredentials = {
            id: `chan_${platform.toLowerCase()}`,
            platform,
            accessToken: "rejected_test_token_123",
            accountId: "account_999",
            accountName: `Test ${platform} Channel`,
          };

          const result = await publishToChannel(channel, {
            content: `Automated Test Post for ${platform} #GBS`,
            linkUrl: "https://gbs.example.com",
            imageUrls: ["https://example.com/test.jpg"],
            videoUrl: platform === "TIKTOK" || platform === "YOUTUBE" ? "https://example.com/test.mp4" : undefined,
          });

          expect(result.platform).toBe(platform);
          expect(result.status).toBe("FAILED");
          expect(result.externalPostId).toBeUndefined();
        }
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it("should validate OAuth token health correctly", () => {
      const healthyChannel: SocialChannelCredentials = {
        id: "c1",
        platform: "LINKEDIN",
        accessToken: "token_abc",
        accountId: "a1",
        accountName: "Healthy Channel",
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const health = validateChannelHealth(healthyChannel);
      expect(health.isHealthy).toBe(true);
      expect(health.status).toBe("HEALTHY");
    });
  });

  // 2. AI Content Studio Tests
  describe("AI Content Studio Engine", () => {
    it("should generate AI captions with hashtags and call to action", async () => {
      const res = await SocialAiStudioService.generateCaption({
        tenantId: mockTenantId,
        topic: "Omnichannel Social Suite Launch",
        platform: "LINKEDIN",
        tone: "professional",
      });

      expect(res.caption).toContain("Omnichannel Social Suite Launch");
      expect(res.hashtags.length).toBeGreaterThan(0);
      expect(res.cta).toBeDefined();
    });

    it("should generate AI hashtags based on topic", async () => {
      const hashtags = await SocialAiStudioService.generateHashtags("Marketing Automation", 5);
      expect(hashtags).toHaveLength(5);
      expect(hashtags[0]).toContain("#");
    });

    it("should recommend best times to post for platforms", async () => {
      const rec = await SocialAiStudioService.getBestTimeToPost(mockTenantId, "INSTAGRAM");
      expect(rec.bestHours.length).toBeGreaterThan(0);
      expect(rec.recommendedDays.length).toBeGreaterThan(0);
    });
  });

  // 3. Unified Engagement Inbox Tests
  describe("Unified Engagement Inbox & Comment Moderation", () => {
    it("should record inbound customer message and compute AI suggested reply", async () => {
      const message = await SocialEngagementService.addMessage({
        tenantId: mockTenantId,
        platform: "WHATSAPP",
        conversationId: `conv_${Date.now()}`,
        senderName: "Enterprise Client",
        senderId: "cust_101",
        messageText: "What are your pricing plans for social media marketing?",
      });

      expect(message.id).toBeDefined();
      expect(message.aiSuggestedReply).toContain("custom quote");
    });

    it("should add comment and perform sentiment analysis and moderation", async () => {
      const comment = await SocialEngagementService.addComment({
        tenantId: mockTenantId,
        platform: "FACEBOOK",
        authorName: "John Doe",
        content: "Awesome platform! Really love the automated AI posting features.",
      });

      expect(comment.sentiment).toBeGreaterThan(0);

      const moderated = await SocialEngagementService.moderateComment(comment.id, "REPLY", "Thank you John!");
      expect(moderated.status).toBe("REPLIED");
      expect(moderated.replyText).toBe("Thank you John!");
    });
  });

  // 4. Social Listening Tests
  describe("Social Listening Engine", () => {
    it("should create keyword monitor and record brand mentions", async () => {
      const monitor = await SocialListeningService.createMonitor({
        tenantId: mockTenantId,
        name: "Brand Reputation Monitor",
        keywords: ["GBS", "Global Business Suite", "Omnichannel"],
        competitors: ["CompetitorX"],
      });

      expect(monitor.id).toBeDefined();

      const mention = await SocialListeningService.recordMention({
        monitorId: monitor.id,
        tenantId: mockTenantId,
        platform: "TWITTER_X",
        authorName: "@techblogger",
        content: "GBS platform is an impressive gamechanger for marketing automation!",
      });

      expect(mention.sentimentScore).toBeGreaterThan(0);
    });
  });

  // 5. REST API Endpoint Contracts
  describe("API Gateway Endpoint Tests", () => {
    it("should list channels and posts via /api/v1/social endpoints", async () => {
      const postsRes = await request(app)
        .get("/api/v1/social/posts")
        .set("Authorization", `Bearer ${authToken}`);
      expect(postsRes.status).toBe(200);
      expect(postsRes.body.data).toBeDefined();

      const channelsRes = await request(app)
        .get("/api/v1/social/channels")
        .set("Authorization", `Bearer ${authToken}`);
      expect(channelsRes.status).toBe(200);
      expect(channelsRes.body.data).toBeDefined();
    });

    it("should generate AI captions via /api/v1/social/ai/caption", async () => {
      const res = await request(app)
        .post("/api/v1/social/ai/caption")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ topic: "Product Feature Release", platform: "TWITTER_X" });

      expect(res.status).toBe(200);
      expect(res.body.caption).toBeDefined();
    });

    it("generates copy and image as one pending package and blocks publish until approval", async () => {
      const generateSpy = jest.spyOn(SocialContentPackageService, "generate").mockResolvedValue({
        caption: "A coordinated launch post. #Launch #LocalBusiness",
        imageBase64: Buffer.from("generated-image").toString("base64"),
        mimeType: "image/png",
        provider: "gemini",
        model: "test-image-model",
      });
      const persistSpy = jest.spyOn(SocialContentPackageService, "persistImage").mockResolvedValue({
        fileName: "generated.png",
        fileSize: 15,
        fileUrl: "http://localhost:4000/generated-media/test/generated.png",
        mimeType: "image/png",
      });

      try {
        const generated = await request(app)
          .post("/api/v1/social/ai/content-package")
          .set("Authorization", `Bearer ${authToken}`)
          .send({ topic: "New location launch", platforms: ["FACEBOOK", "INSTAGRAM"] });

        expect(generated.status).toBe(201);
        expect(generated.body.post.content).toContain("coordinated launch post");
        expect(JSON.parse(generated.body.post.imageUrls)).toHaveLength(1);
        expect(generated.body.post.approvalStatus).toBe("PENDING");
        expect(generated.body.post.status).toBe("PENDING_APPROVAL");
        expect(generated.body.approvalRequest.status).toBe("PENDING");
        expect(generated.body.nextAction).toBe("REVIEW_AND_APPROVE");

        const blocked = await request(app)
          .post(`/api/v1/social/posts/${generated.body.post.id}/publish`)
          .set("Authorization", `Bearer ${authToken}`);
        expect(blocked.status).toBe(409);
        expect(blocked.body.code).toBe("SOCIAL_POST_APPROVAL_REQUIRED");

        const approved = await request(app)
          .post(`/api/v1/social/posts/${generated.body.post.id}/approve`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({ comments: "Copy and image reviewed" });
        expect(approved.status).toBe(200);
        expect(approved.body.approvalStatus).toBe("APPROVED");

        const noChannel = await request(app)
          .post(`/api/v1/social/posts/${generated.body.post.id}/publish`)
          .set("Authorization", `Bearer ${authToken}`);
        expect(noChannel.status).toBe(409);
        expect(noChannel.body.code).toBe("SOCIAL_CHANNEL_REQUIRED");
      } finally {
        generateSpy.mockRestore();
        persistSpy.mockRestore();
      }
    });
  });
});
