import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../index";
import { prisma } from "@saas/database";
import { SocialAiStudioService } from "../services/socialAiStudioService";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";

describe("Phase 12 — Branded AI Poster & SEO Image Generator Test Suite", () => {
  let mockTenantId: string;
  let mockUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Acme Enterprise Corp",
        subdomain: `acme-poster-${Date.now()}`,
        logoUrl: "https://acme.com/assets/logo.png",
      },
    });
    mockTenantId = tenant.id;

    // Create White-Label Config for branding
    await prisma.whiteLabelConfig.create({
      data: {
        tenantId: mockTenantId,
        appTitle: "Acme Global Suite",
        logoUrl: "https://acme.com/assets/logo.png",
        faviconUrl: "https://acme.com/favicon.ico",
        primaryColor: "#FF6B00",
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `poster-admin-${Date.now()}@acme.com`,
        firstName: "Acme",
        lastName: "Admin",
        tenantId: mockTenantId,
      },
    });
    mockUserId = user.id;

    authToken = jwt.sign(
      { userId: mockUserId, tenantId: mockTenantId, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  afterAll(async () => {
    try {
      await prisma.aiContent.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.whiteLabelConfig.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.user.deleteMany({ where: { tenantId: mockTenantId } });
      await prisma.tenant.deleteMany({ where: { id: mockTenantId } });
    } catch (_e) {}
  });

  it("should generate Instagram 1:1 poster with brand logo watermark and SEO tags", async () => {
    const result = await SocialAiStudioService.generatePoster({
      tenantId: mockTenantId,
      topic: "Summer Tech Clearance Sale",
      platform: "INSTAGRAM",
      style: "GOLD_ELEGANCE",
      headline: "50% Off Electronics",
      watermarkPosition: "TOP_RIGHT",
      includeBrandLogo: true,
    });

    expect(result.success).toBe(true);
    expect(result.poster.dataUri).toContain("data:image/svg+xml;base64,");
    expect(result.poster.dimensions.width).toBe(1080);
    expect(result.poster.dimensions.height).toBe(1080);
    expect(result.poster.platformName).toBe("Instagram Post");
    expect(result.seo.seoTitle).toContain("50% Off Electronics");
    expect(result.seo.imageAltText).toContain("Acme Global Suite");
    expect(result.seo.hashtags).toContain("#INSTAGRAM");
  });

  it("should generate LinkedIn 1.91:1 banner poster with custom logo URL", async () => {
    const result = await SocialAiStudioService.generatePoster({
      tenantId: mockTenantId,
      topic: "Enterprise AI Webinar",
      platform: "LINKEDIN",
      style: "CORPORATE_DARK",
      customLogoUrl: "https://acme.com/custom-logo.png",
      watermarkPosition: "BOTTOM_RIGHT",
    });

    expect(result.success).toBe(true);
    expect(result.poster.dimensions.width).toBe(1200);
    expect(result.poster.dimensions.height).toBe(627);
    expect(result.poster.brandLogoUrl).toBe("https://acme.com/custom-logo.png");
  });

  it("should expose REST API POST /api/v1/social/ai/poster", async () => {
    const res = await request(app)
      .post("/api/v1/social/ai/poster")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        topic: "Google Business Profile Promo",
        platform: "GOOGLE_BUSINESS",
        style: "NEON_TECH",
        watermarkPosition: "TOP_LEFT",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.poster.dataUri).toBeDefined();
    expect(res.body.seo.hashtags.length).toBeGreaterThan(0);
  });
});
