import express, { NextFunction, Request, Response } from "express";
import request from "supertest";

const mockAuthContext: { userId: string; id: string; tenantId?: string } = {
  userId: "user-a",
  id: "user-a",
  tenantId: "tenant-a",
};

const mockPrisma = {
  socialPost: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  review: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@saas/database", () => ({ prisma: mockPrisma }));
jest.mock("../middleware/auth", () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = { ...mockAuthContext };
    next();
  },
}));
jest.mock("../middleware/rbac", () => ({
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));
jest.mock("../middleware/portalAccess", () => ({
  requirePortalAccess: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));
jest.mock("../middleware/idempotency", () => ({
  idempotencyMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
}));
jest.mock("../services/auditLogger", () => ({ auditLog: jest.fn() }));

import postsRouter from "../routes/v1/posts";
import { socialPostsRouter } from "../routes/v1/socialPosts";
import { partnerPortalRouter } from "../routes/v1/partnerPortal";

const app = express();
app.use(express.json());
app.use("/api/v1/posts", postsRouter);
app.use("/api/v1/social-posts", socialPostsRouter);
app.use("/api/v1/partner", partnerPortalRouter);

describe("legacy social approval and tenant hardening", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthContext.tenantId = "tenant-a";
    mockPrisma.socialPost.create.mockImplementation(async ({ data }: any) => ({ id: "post-1", ...data }));
    mockPrisma.socialPost.findMany.mockResolvedValue([]);
    mockPrisma.socialPost.findFirst.mockResolvedValue({ id: "post-1", tenantId: "tenant-a", status: "DRAFT" });
    mockPrisma.socialPost.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.socialPost.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.review.findFirst.mockResolvedValue({ id: "review-1" });
    mockPrisma.review.update.mockImplementation(async ({ where, data }: any) => ({ ...where, ...data }));
  });

  it("creates legacy scheduled posts for the authenticated tenant in pending approval", async () => {
    const response = await request(app)
      .post("/api/v1/posts/schedule")
      .send({
        tenantId: "tenant-attacker",
        content: "  Approved only after review  ",
        platforms: ["FACEBOOK", "INSTAGRAM"],
        imageUrls: ["https://cdn.example.com/post.png"],
        scheduledTime: "2030-01-01T10:00:00.000Z",
      });

    expect(response.status).toBe(201);
    expect(mockPrisma.socialPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-a",
        createdByUserId: "user-a",
        content: "Approved only after review",
        platform: "FACEBOOK",
        platforms: JSON.stringify(["FACEBOOK", "INSTAGRAM"]),
        imageUrls: JSON.stringify(["https://cdn.example.com/post.png"]),
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
      }),
    });
  });

  it("never accepts the legacy social-post tenant from query or body", async () => {
    const listed = await request(app).get("/api/v1/social-posts?tenantId=tenant-attacker");
    expect(listed.status).toBe(200);
    expect(mockPrisma.socialPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a" } }),
    );

    const created = await request(app)
      .post("/api/v1/social-posts")
      .send({ tenantId: "tenant-attacker", content: "Tenant safe", platform: "LINKEDIN" });
    expect(created.status).toBe(201);
    expect(mockPrisma.socialPost.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-a",
        createdByUserId: "user-a",
        platforms: JSON.stringify(["LINKEDIN"]),
        imageUrls: "[]",
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
      }),
    });
  });

  it("scopes edits to the authenticated tenant and resets approval state", async () => {
    const response = await request(app)
      .put("/api/v1/social-posts/post-1")
      .send({ content: "Revised content", platforms: ["TWITTER_X"] });

    expect(response.status).toBe(200);
    expect(mockPrisma.socialPost.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: "post-1", tenantId: "tenant-a" },
    });
    expect(mockPrisma.socialPost.updateMany).toHaveBeenCalledWith({
      where: { id: "post-1", tenantId: "tenant-a" },
      data: expect.objectContaining({
        content: "Revised content",
        platform: "TWITTER_X",
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
        approvedByUserId: null,
        publishedAt: null,
      }),
    });
  });

  it("rejects direct workflow-state mutation", async () => {
    const response = await request(app)
      .put("/api/v1/social-posts/post-1")
      .send({ content: "Bypass approval", status: "PUBLISHED", approvalStatus: "APPROVED" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("WORKFLOW_FIELDS_FORBIDDEN");
    expect(mockPrisma.socialPost.updateMany).not.toHaveBeenCalled();
  });

  it("returns not found for cross-tenant edits and deletes", async () => {
    mockPrisma.socialPost.findFirst.mockResolvedValueOnce(null);
    const edited = await request(app)
      .put("/api/v1/social-posts/tenant-b-post")
      .send({ content: "Cross tenant edit" });
    expect(edited.status).toBe(404);
    expect(mockPrisma.socialPost.updateMany).not.toHaveBeenCalled();

    mockPrisma.socialPost.deleteMany.mockResolvedValueOnce({ count: 0 });
    const deleted = await request(app).delete("/api/v1/social-posts/tenant-b-post");
    expect(deleted.status).toBe(404);
    expect(mockPrisma.socialPost.deleteMany).toHaveBeenCalledWith({
      where: { id: "tenant-b-post", tenantId: "tenant-a" },
    });
  });

  it("keeps partner social schedules pending and records the authenticated creator", async () => {
    const response = await request(app)
      .post("/api/v1/partner/social/schedule")
      .send({
        tenantId: "tenant-attacker",
        content: "Partner draft",
        platforms: ["FACEBOOK"],
        imageUrls: ["https://cdn.example.com/partner.png"],
      });

    expect(response.status).toBe(201);
    expect(mockPrisma.socialPost.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-a",
        createdByUserId: "user-a",
        platforms: JSON.stringify(["FACEBOOK"]),
        imageUrls: JSON.stringify(["https://cdn.example.com/partner.png"]),
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
      }),
    });
  });

  it("does not report fake automatic review replies", async () => {
    for (const path of ["/api/v1/partner/reviews/auto-reply-all", "/api/v1/partner/gbp/reviews/auto-reply-all"]) {
      const response = await request(app).post(path);
      expect(response.status).toBe(501);
      expect(response.body.status).toBe("NOT_CONFIGURED");
      expect(response.body.repliedCount).toBe(0);
      expect(response.body.code).toBe("REVIEW_AUTO_REPLY_PROVIDER_NOT_CONFIGURED");
    }
  });

  it("scopes review replies through the review location tenant", async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(null);
    const denied = await request(app)
      .put("/api/v1/partner/gbp/reviews/review-from-tenant-b/reply")
      .send({ replyComment: "No cross-tenant mutation" });
    expect(denied.status).toBe(404);
    expect(mockPrisma.review.findFirst).toHaveBeenCalledWith({
      where: { id: "review-from-tenant-b", location: { tenantId: "tenant-a" } },
      select: { id: true },
    });
    expect(mockPrisma.review.update).not.toHaveBeenCalled();

    const allowed = await request(app)
      .put("/api/v1/partner/gbp/reviews/review-1/reply")
      .send({ replyComment: "Thank you" });
    expect(allowed.status).toBe(200);
    expect(mockPrisma.review.update).toHaveBeenCalledWith({
      where: { id: "review-1" },
      data: expect.objectContaining({ replyComment: "Thank you" }),
    });
  });

  it("rejects social operations when the authenticated token has no tenant", async () => {
    mockAuthContext.tenantId = undefined;
    const response = await request(app)
      .post("/api/v1/posts/schedule")
      .send({ content: "Missing tenant", platform: "FACEBOOK" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("TENANT_CONTEXT_REQUIRED");
    expect(mockPrisma.socialPost.create).not.toHaveBeenCalled();
  });
});
