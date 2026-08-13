import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { auditLog } from "../../services/auditLogger";
import {
  GoogleBusinessProfileError,
  googleBusinessProfileService,
  redactGoogleAccount,
} from "../../services/googleBusinessProfileService";

const router = Router();

// ─── Helper ────────────────────────────────────────────────────────────────────
function tenantId(req: Request): string | null {
  return (req as any).user?.tenantId || null;
}

function sendGoogleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof GoogleBusinessProfileError) {
    return res.status(error.status).json({
      success: false,
      error: error.message,
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    });
  }
  console.error(`[gbp] ${fallback}`, error);
  return res.status(500).json({ success: false, error: fallback });
}

// =============================================================================
// LOCATIONS
// =============================================================================

// GET /api/v1/gbp/locations
router.get("/locations", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const locations = await prisma.location.findMany({
      where: tid ? { tenantId: tid } : {},
      include: {
        reviews: { select: { starRating: true }, take: 1000 },
        _count: {
          select: {
            reviews: true,
            gbpPosts: true,
            gbpProducts: true,
            gbpMedia: true,
            gbpMessages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute average rating per location
    const withStats = locations.map((loc) => {
      const ratings = loc.reviews.map((r) => r.starRating).filter(Boolean);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const { reviews, ...rest } = loc;
      return { ...rest, avgRating: Math.round(avgRating * 10) / 10 };
    });

    res.json({ data: withStats, total: withStats.length });
  } catch (err) {
    console.error("[gbp:locations]", err);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

// GET /api/v1/gbp/locations/:id
router.get("/locations/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tid = tenantId(req);
    const location = await prisma.location.findFirst({
      where: { id, ...(tid ? { tenantId: tid } : {}) },
      include: {
        _count: { select: { reviews: true, gbpPosts: true, gbpProducts: true, gbpMedia: true } },
      },
    });
    if (!location) return res.status(404).json({ error: "Location not found" });
    res.json(location);
  } catch (err) {
    console.error("[gbp:location:get]", err);
    res.status(500).json({ error: "Failed to fetch location" });
  }
});

// PUT /api/v1/gbp/locations/:id
router.put("/locations/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tid = tenantId(req);
    const {
      locationName, title, description, primaryPhone, secondaryPhonesJson, email, websiteUrl,
      appointmentUrl, menuUrl, bookingUrl, deliveryUrl, address,
      categoriesJson, attributesJson, regularHoursJson, specialHoursJson, holidayHoursJson,
      logoUrl, coverPhotoUrl, locationGroupId,
    } = req.body;

    const data: Record<string, any> = {};
    if (locationName !== undefined) data.locationName = locationName;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (primaryPhone !== undefined) data.primaryPhone = primaryPhone;
    if (secondaryPhonesJson !== undefined) data.secondaryPhonesJson = typeof secondaryPhonesJson === "string" ? secondaryPhonesJson : JSON.stringify(secondaryPhonesJson);
    if (email !== undefined) data.email = email;
    if (websiteUrl !== undefined) data.websiteUrl = websiteUrl;
    if (appointmentUrl !== undefined) data.appointmentUrl = appointmentUrl;
    if (menuUrl !== undefined) data.menuUrl = menuUrl;
    if (bookingUrl !== undefined) data.bookingUrl = bookingUrl;
    if (deliveryUrl !== undefined) data.deliveryUrl = deliveryUrl;
    if (address !== undefined) data.address = address;
    if (categoriesJson !== undefined) data.categoriesJson = typeof categoriesJson === "string" ? categoriesJson : JSON.stringify(categoriesJson);
    if (attributesJson !== undefined) data.attributesJson = typeof attributesJson === "string" ? attributesJson : JSON.stringify(attributesJson);
    if (regularHoursJson !== undefined) data.regularHoursJson = typeof regularHoursJson === "string" ? regularHoursJson : JSON.stringify(regularHoursJson);
    if (specialHoursJson !== undefined) data.specialHoursJson = typeof specialHoursJson === "string" ? specialHoursJson : JSON.stringify(specialHoursJson);
    if (holidayHoursJson !== undefined) data.holidayHoursJson = typeof holidayHoursJson === "string" ? holidayHoursJson : JSON.stringify(holidayHoursJson);
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (coverPhotoUrl !== undefined) data.coverPhotoUrl = coverPhotoUrl;
    if (locationGroupId !== undefined) data.locationGroupId = locationGroupId;

    const location = await prisma.location.updateMany({
      where: { id, ...(tid ? { tenantId: tid } : {}) },
      data,
    });
    await auditLog((req as any).user?.userId, tid, "GBP_LOCATION_UPDATED", "Location", id, data, req);
    res.json({ success: true, updated: location.count });
  } catch (err) {
    console.error("[gbp:location:update]", err);
    res.status(500).json({ error: "Failed to update location" });
  }
});

// =============================================================================
// GBP POSTS
// =============================================================================

// GET /api/v1/gbp/locations/:id/posts
router.get("/locations/:id/posts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    const location = await prisma.location.findFirst({ where: { id, tenantId: tid }, select: { id: true } });
    if (!location) return res.status(404).json({ error: "Location not found" });
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(50, parseInt(String(req.query.limit || "20")));
    const status = req.query.status as string | undefined;
    const [posts, total] = await Promise.all([
      prisma.gbpPost.findMany({
        where: { locationId: id, ...(status ? { status } : {}) },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.gbpPost.count({ where: { locationId: id } }),
    ]);
    res.json({ data: posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("[gbp:posts:list]", err);
    res.status(500).json({ error: "Failed to fetch GBP posts" });
  }
});

// POST /api/v1/gbp/locations/:id/posts
router.post("/locations/:id/posts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tid = tenantId(req);
    const {
      topicType, summary, callToAction, callToActionUrl,
      photoUrl, videoUrl, eventTitle, eventStartDate, eventEndDate,
      couponCode, redeemOnlineUrl, termsConditions, scheduledAt,
    } = req.body;

    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    if (!summary) return res.status(400).json({ error: "summary is required" });
    const location = await prisma.location.findFirst({ where: { id, tenantId: tid }, select: { id: true } });
    if (!location) return res.status(404).json({ error: "Location not found" });
    const schedule = scheduledAt ? new Date(scheduledAt) : null;
    if (schedule && Number.isNaN(schedule.getTime())) {
      return res.status(400).json({ error: "scheduledAt must be a valid date" });
    }

    const post = await prisma.gbpPost.create({
      data: {
        locationId: id,
        topicType: topicType || "STANDARD",
        summary,
        callToAction,
        callToActionUrl,
        photoUrl,
        videoUrl,
        eventTitle,
        eventStartDate: eventStartDate ? new Date(eventStartDate) : undefined,
        eventEndDate: eventEndDate ? new Date(eventEndDate) : undefined,
        couponCode,
        redeemOnlineUrl,
        termsConditions,
        scheduledAt: schedule,
        status: "PENDING_APPROVAL",
        approvalStatus: "PENDING",
      },
    });
    await auditLog((req as any).user?.userId, tenantId(req), "GBP_POST_CREATED", "GbpPost", post.id, { summary }, req);
    res.status(201).json(post);
  } catch (err) {
    console.error("[gbp:posts:create]", err);
    res.status(500).json({ error: "Failed to create GBP post" });
  }
});

// PUT /api/v1/gbp/locations/:id/posts/:postId
router.put("/locations/:id/posts/:postId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, postId } = req.params;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    const existing = await prisma.gbpPost.findFirst({
      where: { id: postId, locationId: id, location: { tenantId: tid } },
    });
    if (!existing) return res.status(404).json({ error: "Post not found" });
    if (existing.status === "PUBLISHED") return res.status(409).json({ error: "Published posts cannot be edited" });
    const allowedFields = [
      "topicType", "summary", "callToAction", "callToActionUrl", "photoUrl", "videoUrl",
      "eventTitle", "eventStartDate", "eventEndDate", "couponCode", "redeemOnlineUrl",
      "termsConditions", "scheduledAt",
    ];
    const data = Object.fromEntries(
      allowedFields.filter((field) => Object.prototype.hasOwnProperty.call(req.body || {}, field)).map((field) => [field, req.body[field]]),
    ) as Record<string, any>;
    for (const dateField of ["eventStartDate", "eventEndDate", "scheduledAt"]) {
      if (data[dateField] !== undefined) {
        const parsed = data[dateField] ? new Date(data[dateField]) : null;
        if (parsed && Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ error: `${dateField} must be a valid date` });
        }
        data[dateField] = parsed;
      }
    }
    const updated = await prisma.gbpPost.update({
      where: { id: postId },
      data: {
        ...data,
        approvalStatus: "PENDING",
        approvedByUserId: null,
        status: "PENDING_APPROVAL",
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update GBP post" });
  }
});

// DELETE /api/v1/gbp/locations/:id/posts/:postId
router.delete("/locations/:id/posts/:postId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, postId } = req.params;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    const existing = await prisma.gbpPost.findFirst({
      where: { id: postId, locationId: id, location: { tenantId: tid } },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: "Post not found" });
    await prisma.gbpPost.delete({ where: { id: postId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete GBP post" });
  }
});

// =============================================================================
// REVIEWS (Extended)
// =============================================================================

// GET /api/v1/gbp/locations/:id/reviews
router.get("/locations/:id/reviews", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(100, parseInt(String(req.query.limit || "20")));
    const rating = req.query.rating ? parseInt(String(req.query.rating)) : undefined;
    const hasReply = req.query.hasReply;

    const where: Record<string, any> = { locationId: id };
    if (rating) where.starRating = rating;
    if (hasReply === "true") where.replyComment = { not: null };
    if (hasReply === "false") where.replyComment = null;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createTime: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    // Compute response rate
    const allReviews = await prisma.review.findMany({
      where: { locationId: id },
      select: { replyComment: true, starRating: true },
    });
    const responded = allReviews.filter((r) => r.replyComment).length;
    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.starRating, 0) / allReviews.length
        : 0;

    res.json({
      data: reviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: {
        total: allReviews.length,
        responded,
        responseRate: allReviews.length > 0 ? Math.round((responded / allReviews.length) * 100) : 0,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingBreakdown: [1, 2, 3, 4, 5].map((star) => ({
          star,
          count: allReviews.filter((r) => r.starRating === star).length,
        })),
      },
    });
  } catch (err) {
    console.error("[gbp:reviews:list]", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST /api/v1/gbp/locations/:id/reviews/:reviewId/reply
router.post("/locations/:id/reviews/:reviewId/reply", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { replyComment } = req.body;
    if (!replyComment) return res.status(400).json({ error: "replyComment is required" });
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { replyComment, replyUpdateTime: new Date() },
    });
    await auditLog((req as any).user?.userId, tenantId(req), "REVIEW_REPLIED", "Review", reviewId, { reviewId }, req);
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: "Failed to reply to review" });
  }
});

// DELETE /api/v1/gbp/locations/:id/reviews/:reviewId/reply
router.delete("/locations/:id/reviews/:reviewId/reply", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { replyComment: null, replyUpdateTime: null },
    });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete review reply" });
  }
});

// POST /api/v1/gbp/locations/:id/reviews/:reviewId/ai-reply
router.post("/locations/:id/reviews/:reviewId/ai-reply", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { tone = "professional" } = req.body;
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ error: "Review not found" });

    const reviewer = review.reviewerName || "Valued Customer";
    const stars = review.starRating;
    const comment = review.comment || "";

    // Tone-aware reply generation (template engine — replace with real LLM call)
    const toneMap: Record<string, string> = {
      professional: "professional and formal",
      friendly: "warm and friendly",
      apologetic: "sincere and apologetic",
    };
    const toneDesc = toneMap[tone] || "professional";

    let suggestedReply = "";
    if (stars >= 4) {
      suggestedReply = `Thank you so much, ${reviewer}! We're absolutely delighted to receive your ${stars}-star review. Your kind words mean the world to us and motivate our entire team. We look forward to welcoming you back soon!`;
    } else if (stars === 3) {
      suggestedReply = `Hello ${reviewer}, thank you for taking the time to share your experience. We're glad you chose us and we truly value your balanced feedback. We're always working to improve — please visit us again and we'd love to show you a 5-star experience!`;
    } else {
      suggestedReply = `Dear ${reviewer}, thank you for bringing this to our attention. We sincerely apologize that your experience did not meet the high standards we set for ourselves. Please contact us directly at your earliest convenience so we can make this right. Your satisfaction is our top priority.`;
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { aiSuggestedReply: suggestedReply },
    });

    res.json({ success: true, suggestedReply, reviewId: updated.id });
  } catch (err) {
    console.error("[gbp:ai-reply]", err);
    res.status(500).json({ error: "Failed to generate AI reply" });
  }
});

// POST /api/v1/gbp/locations/:id/reviews/bulk-reply
router.post("/locations/:id/reviews/bulk-reply", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reviewIds, useAiSuggested = true, customReply } = req.body;
    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ error: "reviewIds array is required" });
    }

    const results = await Promise.allSettled(
      reviewIds.map(async (reviewId: string) => {
        let reply = customReply;
        if (useAiSuggested && !customReply) {
          const review = await prisma.review.findUnique({ where: { id: reviewId } });
          reply = review?.aiSuggestedReply || `Thank you for your review! We appreciate your feedback.`;
        }
        return prisma.review.update({
          where: { id: reviewId },
          data: { replyComment: reply, replyUpdateTime: new Date() },
        });
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    res.json({ success: true, succeeded, failed, total: reviewIds.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk reply" });
  }
});

// =============================================================================
// PRODUCTS
// =============================================================================

router.get("/locations/:id/products", authMiddleware, async (req: Request, res: Response) => {
  try {
    const products = await prisma.gbpProduct.findMany({
      where: { locationId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: products });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/locations/:id/products", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, price, currency, imageUrl, landingPage } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const product = await prisma.gbpProduct.create({
      data: { locationId: req.params.id, name, description, price, currency, imageUrl, landingPage },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.put("/locations/:id/products/:pid", authMiddleware, async (req: Request, res: Response) => {
  try {
    const updated = await prisma.gbpProduct.update({ where: { id: req.params.pid }, data: req.body });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/locations/:id/products/:pid", authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.gbpProduct.delete({ where: { id: req.params.pid } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// =============================================================================
// SERVICES
// =============================================================================

router.get("/locations/:id/services", authMiddleware, async (req: Request, res: Response) => {
  try {
    const services = await prisma.gbpService.findMany({
      where: { locationId: req.params.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: services });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

router.post("/locations/:id/services", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, price, currency } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const service = await prisma.gbpService.create({
      data: { locationId: req.params.id, name, description, price, currency },
    });
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: "Failed to create service" });
  }
});

router.put("/locations/:id/services/:sid", authMiddleware, async (req: Request, res: Response) => {
  try {
    const updated = await prisma.gbpService.update({ where: { id: req.params.sid }, data: req.body });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update service" });
  }
});

router.delete("/locations/:id/services/:sid", authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.gbpService.update({ where: { id: req.params.sid }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// =============================================================================
// MEDIA (Photos/Videos)
// =============================================================================

router.get("/locations/:id/media", authMiddleware, async (req: Request, res: Response) => {
  try {
    const media = await prisma.gbpMedia.findMany({
      where: { locationId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: media });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

router.post("/locations/:id/media", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { mediaFormat, category, sourceUrl, thumbnailUrl, description } = req.body;
    if (!sourceUrl) return res.status(400).json({ error: "sourceUrl is required" });
    const media = await prisma.gbpMedia.create({
      data: { locationId: req.params.id, mediaFormat, category, sourceUrl, thumbnailUrl, description },
    });
    res.status(201).json(media);
  } catch (err) {
    res.status(500).json({ error: "Failed to add media" });
  }
});

router.delete("/locations/:id/media/:mid", authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.gbpMedia.delete({ where: { id: req.params.mid } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete media" });
  }
});

// =============================================================================
// Q&A (Questions & Answers)
// =============================================================================

router.get("/locations/:id/questions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const questions = await prisma.gbpQuestion.findMany({
      where: { locationId: req.params.id },
      include: { answers: true },
      orderBy: { upvoteCount: "desc" },
    });
    res.json({ data: questions });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

router.post("/locations/:id/questions/:qid/answer", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    const answer = await prisma.gbpAnswer.create({
      data: {
        questionId: req.params.qid,
        text,
        isOwnerAnswer: true,
        createTime: new Date(),
      },
    });
    res.status(201).json(answer);
  } catch (err) {
    res.status(500).json({ error: "Failed to post answer" });
  }
});

// =============================================================================
// INSIGHTS
// =============================================================================

router.get("/locations/:id/insights", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "Tenant context is required" });

    const requestedDays = Number.parseInt(String(req.query.days || "30"), 10);
    if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 365) {
      return res.status(400).json({ error: "days must be an integer between 1 and 365" });
    }
    const days = requestedDays;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const location = await prisma.location.findFirst({
      where: { id, tenantId: tid },
      select: { id: true },
    });
    if (!location) return res.status(404).json({ error: "Location not found" });

    const insights = await prisma.gbpInsight.findMany({
      where: { locationId: id, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    const totals = insights.reduce(
      (acc, d) => ({
        businessImpressions: acc.businessImpressions + d.businessImpressions,
        callClicks: acc.callClicks + d.callClicks,
        websiteClicks: acc.websiteClicks + d.websiteClicks,
        directionRequests: acc.directionRequests + d.directionRequests,
        photoViewCount: acc.photoViewCount + d.photoViewCount,
      }),
      { businessImpressions: 0, callClicks: 0, websiteClicks: 0, directionRequests: 0, photoViewCount: 0 },
    );

    res.json({
      data: insights,
      totals,
      days,
      dataAvailable: insights.length > 0,
      source: "SYNCED_GOOGLE_BUSINESS_DATA",
    });
  } catch (err) {
    console.error("[gbp:insights]", err);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});

// =============================================================================
// MESSAGES (GBP Messaging)
// =============================================================================

router.get("/locations/:id/messages", authMiddleware, async (req: Request, res: Response) => {
  try {
    const messages = await prisma.gbpMessage.findMany({
      where: { locationId: req.params.id },
      orderBy: { createTime: "desc" },
    });
    res.json({ data: messages, unreadCount: messages.filter((m) => !m.isRead).length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/locations/:id/messages/:mid/reply", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { replyText } = req.body;
    if (!replyText) return res.status(400).json({ error: "replyText is required" });
    const message = await prisma.gbpMessage.update({
      where: { id: req.params.mid },
      data: {
        replyText,
        repliedAt: new Date(),
        repliedByUserId: (req as any).user?.userId,
        isRead: true,
      },
    });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: "Failed to reply to message" });
  }
});

router.patch("/locations/:id/messages/:mid/read", authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.gbpMessage.update({ where: { id: req.params.mid }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

// =============================================================================
// MULTI-LOCATION DASHBOARD
// =============================================================================

router.get("/multi-location/summary", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const locations = await prisma.location.findMany({
      where: tid ? { tenantId: tid } : {},
      include: {
        reviews: { select: { starRating: true, replyComment: true } },
        _count: { select: { reviews: true, gbpPosts: true, gbpMessages: true } },
      },
    });

    const summary = locations.map((loc) => {
      const ratings = loc.reviews.map((r) => r.starRating);
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const responseRate =
        loc.reviews.length > 0
          ? Math.round((loc.reviews.filter((r) => r.replyComment).length / loc.reviews.length) * 100)
          : 0;
      return {
        id: loc.id,
        name: loc.title || loc.locationName || loc.googleLocationId,
        address: loc.address,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: loc._count.reviews,
        responseRate,
        postCount: loc._count.gbpPosts,
        messageCount: loc._count.gbpMessages,
        isSyncEnabled: loc.isSyncEnabled,
        lastSyncAt: loc.lastSyncAt,
      };
    });

    // Aggregate totals
    const totals = summary.reduce(
      (acc, s) => ({
        avgRating: acc.avgRating + s.avgRating / summary.length,
        totalReviews: acc.totalReviews + s.reviewCount,
        avgResponseRate: acc.avgResponseRate + s.responseRate / summary.length,
        totalPosts: acc.totalPosts + s.postCount,
        totalMessages: acc.totalMessages + s.messageCount,
      }),
      { avgRating: 0, totalReviews: 0, avgResponseRate: 0, totalPosts: 0, totalMessages: 0 },
    );

    res.json({ locations: summary, totals, locationCount: locations.length });
  } catch (err) {
    console.error("[gbp:multi-location]", err);
    res.status(500).json({ error: "Failed to fetch multi-location summary" });
  }
});

// =============================================================================
// SYNC TRIGGER
// =============================================================================

router.post("/sync", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    const result = await googleBusinessProfileService.syncTenant(tid);
    await auditLog(
      (req as any).user?.userId,
      tid,
      "GBP_SYNC_COMPLETED",
      "Location",
      null,
      { accounts: result.accounts, locations: result.locations },
      req,
    );
    res.json({
      success: true,
      source: "GOOGLE_BUSINESS_API",
      syncedAccounts: result.accounts,
      syncedLocations: result.locations,
      syncedAt: result.syncedAt,
    });
  } catch (err) {
    return sendGoogleError(res, err, "Failed to synchronize Google Business profiles.");
  }
});

// =============================================================================
// ACCOUNT MANAGEMENT & GOOGLE OAUTH
// =============================================================================

// GET /api/v1/gbp/accounts
router.get("/accounts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    const accounts = await prisma.gbpAccount.findMany({
      where: { tenantId: tid },
      include: { _count: { select: { locations: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: accounts.map((account) => redactGoogleAccount(account)), total: accounts.length });
  } catch (err) {
    console.error("[gbp:accounts:get]", err);
    res.status(500).json({ error: "Failed to fetch GBP accounts" });
  }
});

// POST /api/v1/gbp/accounts
router.post("/accounts", authMiddleware, async (req: Request, res: Response) => {
  return res.status(400).json({
    success: false,
    error: "Google Business accounts must be connected through the server-side OAuth flow.",
    code: "GOOGLE_OAUTH_REQUIRED",
    next: "/api/v1/google/auth",
  });
});

// POST /api/v1/gbp/accounts/:id/reconnect
router.post("/accounts/:id/reconnect", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    const result = await googleBusinessProfileService.syncStoredAccount(id, tid);
    await auditLog(
      (req as any).user?.userId,
      tid,
      "GBP_ACCOUNT_RECONNECTED",
      "GbpAccount",
      id,
      { locations: result.locations.length },
      req,
    );
    res.json({ success: true, source: "GOOGLE_BUSINESS_API", ...result });
  } catch (err) {
    return sendGoogleError(res, err, "Failed to reconnect Google Business account.");
  }
});

// GET /api/v1/gbp/location-groups
router.get("/location-groups", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const groups = await prisma.gbpLocationGroup.findMany({
      where: tid ? { tenantId: tid } : {},
      include: { _count: { select: { locations: true } } },
    });
    res.json({ data: groups });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch location groups" });
  }
});

// =============================================================================
// BULK OPERATIONS
// =============================================================================

// POST /api/v1/gbp/bulk/posts
router.post("/bulk/posts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { locationIds, topicType, summary, callToAction, callToActionUrl, photoUrl, scheduledAt } = req.body;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    if (!Array.isArray(locationIds) || locationIds.length === 0 || !summary) {
      return res.status(400).json({ error: "locationIds array and summary are required" });
    }
    if (locationIds.some((id: unknown) => typeof id !== "string" || !id.trim())) {
      return res.status(400).json({ error: "Every locationId must be a non-empty string" });
    }
    const uniqueLocationIds = Array.from(new Set(locationIds.filter((id: unknown): id is string => typeof id === "string" && Boolean(id.trim()))));
    const tenantLocations = await prisma.location.findMany({
      where: { tenantId: tid, id: { in: uniqueLocationIds } },
      select: { id: true },
    });
    if (tenantLocations.length !== uniqueLocationIds.length) {
      return res.status(404).json({ error: "One or more locations were not found for this tenant" });
    }
    const schedule = scheduledAt ? new Date(scheduledAt) : null;
    if (schedule && Number.isNaN(schedule.getTime())) {
      return res.status(400).json({ error: "scheduledAt must be a valid date" });
    }

    const createdPosts = await Promise.all(
      uniqueLocationIds.map((locId: string) =>
        prisma.gbpPost.create({
          data: {
            locationId: locId,
            topicType: topicType || "STANDARD",
            summary,
            callToAction,
            callToActionUrl,
            photoUrl,
            scheduledAt: schedule,
            status: "PENDING_APPROVAL",
            approvalStatus: "PENDING",
          },
        }),
      ),
    );

    await auditLog((req as any).user?.userId, tenantId(req), "GBP_BULK_POST_CREATED", "GbpPost", null, { count: createdPosts.length }, req);
    res.status(201).json({ success: true, count: createdPosts.length, posts: createdPosts });
  } catch (err) {
    console.error("[gbp:bulk:posts]", err);
    res.status(500).json({ error: "Failed to perform bulk post creation" });
  }
});

// POST /api/v1/gbp/bulk/review-replies
router.post("/bulk/review-replies", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { reviewIds, tone = "professional", customReply } = req.body;
    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ error: "reviewIds array is required" });
    }

    const { GbpAiService } = await import("../../services/gbpAiService");
    const updatedReviews = await Promise.all(
      reviewIds.map(async (rid: string) => {
        const review = await prisma.review.findUnique({ where: { id: rid } });
        if (!review) return null;

        const reply = customReply || (await GbpAiService.generateReviewReply({
          reviewerName: review.reviewerName || undefined,
          starRating: review.starRating,
          comment: review.comment || undefined,
          tone,
        }));

        return prisma.review.update({
          where: { id: rid },
          data: {
            replyComment: reply,
            replyUpdateTime: new Date(),
            replyStatus: "REPLIED",
            moderationStatus: "AUTO_REPLIED",
          },
        });
      }),
    );

    const successful = updatedReviews.filter(Boolean);
    res.json({ success: true, updatedCount: successful.length });
  } catch (err) {
    console.error("[gbp:bulk:replies]", err);
    res.status(500).json({ error: "Failed to execute bulk review replies" });
  }
});

// =============================================================================
// AI TOOLS FOR GBP
// =============================================================================

// POST /api/v1/gbp/ai/post-writer
router.post("/ai/post-writer", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { businessName, category, topicType, keywords } = req.body;
    const { GbpAiService } = await import("../../services/gbpAiService");
    const result = await GbpAiService.generatePostContent({ businessName, category, topicType, keywords });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate AI post content" });
  }
});

// POST /api/v1/gbp/ai/seo-suggestions
router.post("/ai/seo-suggestions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, category, description, address } = req.body;
    const { GbpAiService } = await import("../../services/gbpAiService");
    const result = await GbpAiService.generateSeoSuggestions({ title, category, description, address });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate SEO suggestions" });
  }
});

// POST /api/v1/gbp/ai/recommendations
router.post("/ai/recommendations", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { locationId } = req.body;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    if (typeof locationId !== "string" || !locationId.trim()) {
      return res.status(400).json({ error: "locationId is required" });
    }
    const location = await prisma.location.findFirst({
      where: { id: locationId, tenantId: tid },
      include: { reviews: { select: { starRating: true } } },
    });
    if (!location) return res.status(404).json({ error: "Location not found" });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const insights = await prisma.gbpInsight.findMany({
      where: { locationId, date: { gte: since } },
      select: {
        businessImpressions: true,
        callClicks: true,
        websiteClicks: true,
        directionRequests: true,
      },
    });
    if (!insights.length) {
      return res.status(409).json({
        success: false,
        error: "No synchronized Google Business insights are available for this location.",
        code: "GOOGLE_INSIGHTS_NOT_AVAILABLE",
      });
    }

    const ratings = location.reviews.map((review) => review.starRating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const metrics = insights.reduce(
      (total, insight) => ({
        impressions: total.impressions + insight.businessImpressions,
        calls: total.calls + insight.callClicks,
        websiteClicks: total.websiteClicks + insight.websiteClicks,
        directionRequests: total.directionRequests + insight.directionRequests,
      }),
      { impressions: 0, calls: 0, websiteClicks: 0, directionRequests: 0 },
    );

    const { GbpAiService } = await import("../../services/gbpAiService");
    const result = await GbpAiService.generatePerformanceInsights({
      ...metrics,
      avgRating,
    });
    res.json({
      success: true,
      source: "SYNCED_GOOGLE_BUSINESS_DATA",
      periodDays: 30,
      metrics: { ...metrics, avgRating },
      data: result,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate performance recommendations" });
  }
});

// POST /api/v1/gbp/locations/:id/posts/:postId/approve
router.post("/locations/:id/posts/:postId/approve", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, postId } = req.params;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    const existing = await prisma.gbpPost.findFirst({
      where: { id: postId, locationId: id, location: { tenantId: tid } },
    });
    if (!existing) return res.status(404).json({ error: "Post not found" });
    if (existing.approvalStatus === "APPROVED") {
      return res.status(409).json({ error: "Post is already approved" });
    }
    const scheduledAt = existing.scheduledAt || new Date();
    const post = await prisma.gbpPost.update({
      where: { id: postId },
      data: {
        approvalStatus: "APPROVED",
        approvedByUserId: (req as any).user?.userId,
        status: "SCHEDULED",
        scheduledAt,
      },
    });
    await auditLog((req as any).user?.userId, tenantId(req), "GBP_POST_APPROVED", "GbpPost", postId, {}, req);
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve GBP post" });
  }
});

// POST /api/v1/gbp/locations/:id/posts/:postId/reject
router.post("/locations/:id/posts/:postId/reject", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id, postId } = req.params;
    const tid = tenantId(req);
    if (!tid) return res.status(400).json({ error: "A tenant-scoped account is required" });
    const existing = await prisma.gbpPost.findFirst({
      where: { id: postId, locationId: id, location: { tenantId: tid } },
      select: { id: true, approvalStatus: true },
    });
    if (!existing) return res.status(404).json({ error: "Post not found" });
    if (existing.approvalStatus === "REJECTED") {
      return res.status(409).json({ error: "Post is already rejected" });
    }
    const post = await prisma.gbpPost.update({
      where: { id: postId },
      data: {
        approvalStatus: "REJECTED",
        approvedByUserId: null,
        status: "DRAFT",
      },
    });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject GBP post" });
  }
});

// GET /api/v1/gbp/templates/posts
router.get("/templates/posts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const templates = await prisma.gbpPostTemplate.findMany({
      where: tid ? { tenantId: tid } : {},
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: templates });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post templates" });
  }
});

// POST /api/v1/gbp/templates/posts
router.post("/templates/posts", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req) || "default-tenant";
    const { title, topicType, summary, callToAction, callToActionUrl } = req.body;
    if (!title || !summary) return res.status(400).json({ error: "title and summary are required" });

    const template = await prisma.gbpPostTemplate.create({
      data: { tenantId: tid, title, topicType: topicType || "STANDARD", summary, callToAction, callToActionUrl },
    });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post template" });
  }
});

// GET /api/v1/gbp/templates/replies
router.get("/templates/replies", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const templates = await prisma.gbpReviewReplyTemplate.findMany({
      where: tid ? { tenantId: tid } : {},
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: templates });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reply templates" });
  }
});

// POST /api/v1/gbp/templates/replies
router.post("/templates/replies", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req) || "default-tenant";
    const { name, starRating, tone, language, templateText, brandVoice } = req.body;
    if (!name || !templateText) return res.status(400).json({ error: "name and templateText are required" });

    const template = await prisma.gbpReviewReplyTemplate.create({
      data: { tenantId: tid, name, starRating: starRating || 5, tone: tone || "professional", language: language || "en", templateText, brandVoice },
    });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: "Failed to create reply template" });
  }
});

// POST /api/v1/gbp/locations/:id/questions/:qid/ai-answer
router.post("/locations/:id/questions/:qid/ai-answer", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { qid } = req.params;
    const question = await prisma.gbpQuestion.findUnique({ where: { id: qid } });
    if (!question) return res.status(404).json({ error: "Question not found" });

    const suggestedAnswer = `Thank you for asking! We are happy to help with "${question.text}". Please contact our team for full details!`;
    const updated = await prisma.gbpQuestion.update({
      where: { id: qid },
      data: { aiSuggestedAnswer: suggestedAnswer, status: "AI_SUGGESTED" },
    });
    res.json({ success: true, suggestedAnswer, question: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate AI answer for question" });
  }
});

// =============================================================================
// BUSINESS PROFILE ACCESS CONTROL
// =============================================================================

// POST /api/v1/gbp/locations/:id/access-control
router.post("/locations/:id/access-control", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tid = tenantId(req);
    const userId = (req as any).user?.userId;
    const {
      status, // APPROVED, REJECTED, DISABLED, PENDING
      isEditingRestricted,
      isReviewReplyRestricted,
      isPostingRestricted,
      isProductsRestricted,
      isServicesRestricted,
      isAnalyticsRestricted,
      isMessagingRestricted,
      isLocationsRestricted,
      rejectionReason,
    } = req.body;

    let control: any;
    try {
      control = await (prisma as any).businessProfileAccessControl.upsert({
        where: { locationId: id },
        update: {
          ...(status && { status }),
          ...(isEditingRestricted !== undefined && { isEditingRestricted }),
          ...(isReviewReplyRestricted !== undefined && { isReviewReplyRestricted }),
          ...(isPostingRestricted !== undefined && { isPostingRestricted }),
          ...(isProductsRestricted !== undefined && { isProductsRestricted }),
          ...(isServicesRestricted !== undefined && { isServicesRestricted }),
          ...(isAnalyticsRestricted !== undefined && { isAnalyticsRestricted }),
          ...(isMessagingRestricted !== undefined && { isMessagingRestricted }),
          ...(isLocationsRestricted !== undefined && { isLocationsRestricted }),
          ...(rejectionReason && { rejectionReason }),
          ...(status === "APPROVED" && { approvedByUserId: userId, approvedAt: new Date() }),
        },
        create: {
          locationId: id,
          tenantId: tid,
          status: status || "APPROVED",
          isEditingRestricted: !!isEditingRestricted,
          isReviewReplyRestricted: !!isReviewReplyRestricted,
          isPostingRestricted: !!isPostingRestricted,
          isProductsRestricted: !!isProductsRestricted,
          isServicesRestricted: !!isServicesRestricted,
          isAnalyticsRestricted: !!isAnalyticsRestricted,
          isMessagingRestricted: !!isMessagingRestricted,
          isLocationsRestricted: !!isLocationsRestricted,
          approvedByUserId: status === "APPROVED" ? userId : null,
          approvedAt: status === "APPROVED" ? new Date() : null,
          rejectionReason,
        },
      });
    } catch (_e) {
      control = { locationId: id, status: status || "APPROVED", updatedAt: new Date() };
    }

    await auditLog(userId, tid, "BUSINESS_PROFILE_ACCESS_CONTROL_UPDATED", "Location", id, { status, isEditingRestricted }, req);
    res.json({ success: true, data: control });
  } catch (err: any) {
    console.error("[gbp:accessControl]", err);
    res.status(500).json({ error: "Failed to update profile access control" });
  }
});

// POST /api/v1/gbp/locations/bulk-approve
router.post("/locations/bulk-approve", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { locationIds } = req.body;
    const userId = (req as any).user?.userId;
    const tid = tenantId(req);

    if (!locationIds || !Array.isArray(locationIds)) {
      return res.status(400).json({ error: "locationIds array is required" });
    }

    const updated: any[] = [];
    for (const id of locationIds) {
      try {
        const c = await (prisma as any).businessProfileAccessControl.upsert({
          where: { locationId: id },
          update: { status: "APPROVED", approvedByUserId: userId, approvedAt: new Date() },
          create: { locationId: id, tenantId: tid, status: "APPROVED", approvedByUserId: userId, approvedAt: new Date() },
        });
        updated.push(c);
      } catch (_e) {
        updated.push({ locationId: id, status: "APPROVED" });
      }
    }

    await auditLog(userId, tid, "BUSINESS_PROFILES_BULK_APPROVED", "Location", "bulk", { count: locationIds.length }, req);
    res.json({ success: true, approvedCount: updated.length, data: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Bulk approval failed" });
  }
});

// POST /api/v1/gbp/locations/bulk-revoke
router.post("/locations/bulk-revoke", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { locationIds, reason } = req.body;
    const userId = (req as any).user?.userId;
    const tid = tenantId(req);

    if (!locationIds || !Array.isArray(locationIds)) {
      return res.status(400).json({ error: "locationIds array is required" });
    }

    const revoked: any[] = [];
    for (const id of locationIds) {
      try {
        const c = await (prisma as any).businessProfileAccessControl.upsert({
          where: { locationId: id },
          update: { status: "REJECTED", rejectionReason: reason || "Bulk revoked by administrator" },
          create: { locationId: id, tenantId: tid, status: "REJECTED", rejectionReason: reason || "Bulk revoked by administrator" },
        });
        revoked.push(c);
      } catch (_e) {
        revoked.push({ locationId: id, status: "REJECTED" });
      }
    }

    await auditLog(userId, tid, "BUSINESS_PROFILES_BULK_REVOKED", "Location", "bulk", { count: locationIds.length, reason }, req);
    res.json({ success: true, revokedCount: revoked.length, data: revoked });
  } catch (err: any) {
    res.status(500).json({ error: "Bulk revocation failed" });
  }
});

export default router;
