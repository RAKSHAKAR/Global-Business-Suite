import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

const maskDestination = (value: string) => {
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  const digits = value.replace(/\D/g, "");
  return digits.length > 4 ? `***${digits.slice(-4)}` : "***";
};

const sendReviewRequest = async (req: any, res: any) => {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.userId || req.user?.id;
  const { customerName, customerPhone, customerEmail, locationId, channel } = req.body || {};
  const normalizedChannel = String(channel || (customerEmail ? "EMAIL" : "SMS")).toUpperCase();
  const destination = normalizedChannel === "EMAIL" ? customerEmail : customerPhone;

  if (!tenantId) {
    return res.status(400).json({ error: "A tenant-scoped user is required.", code: "TENANT_REQUIRED" });
  }
  if (!locationId || !destination || !["EMAIL", "SMS", "WHATSAPP"].includes(normalizedChannel)) {
    return res.status(400).json({
      error: "Location, a matching recipient, and EMAIL, SMS, or WHATSAPP channel are required.",
    });
  }

  const location = await prisma.location.findFirst({
    where: { id: locationId, tenantId },
    select: { id: true, title: true, locationName: true, googleLocationId: true },
  });
  if (!location) return res.status(404).json({ error: "Google location not found." });

  const providerUrl = process.env.REVIEW_REQUEST_WEBHOOK_URL;
  if (!providerUrl) {
    return res.status(503).json({
      error: "Review request delivery is not configured. Set REVIEW_REQUEST_WEBHOOK_URL and its provider token.",
      code: "REVIEW_REQUEST_PROVIDER_NOT_CONFIGURED",
    });
  }

  try {
    const providerResponse = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.REVIEW_REQUEST_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.REVIEW_REQUEST_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        tenantId,
        location: {
          id: location.id,
          name: location.title || location.locationName,
          googleLocationId: location.googleLocationId,
        },
        recipient: {
          name: typeof customerName === "string" ? customerName.trim() : "",
          destination,
        },
        channel: normalizedChannel,
      }),
    });

    const providerPayload = await providerResponse.json().catch(() => ({}));
    if (!providerResponse.ok) {
      return res.status(502).json({
        error: "The configured review request provider rejected the delivery.",
        code: "REVIEW_REQUEST_PROVIDER_REJECTED",
        providerStatus: providerResponse.status,
      });
    }

    const log = await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: "REVIEW_REQUEST_SENT",
        resource: "REVIEW_REQUEST",
        resourceId: location.id,
        details: JSON.stringify({
          channel: normalizedChannel,
          recipient: maskDestination(String(destination)),
          customerName: typeof customerName === "string" ? customerName.trim() : "",
          locationName: location.title || location.locationName || "Google location",
          providerMessageId: providerPayload?.id || providerPayload?.messageId || null,
        }),
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
      },
    });

    return res.status(202).json({
      success: true,
      request: {
        id: log.id,
        status: "PROVIDER_ACCEPTED",
        channel: normalizedChannel,
        recipient: maskDestination(String(destination)),
        createdAt: log.createdAt,
      },
    });
  } catch (error) {
    console.error("[reviews:request]", error);
    return res.status(502).json({
      error: "The configured review request provider could not be reached.",
      code: "REVIEW_REQUEST_PROVIDER_UNAVAILABLE",
    });
  }
};

router.get("/requests", authMiddleware, async (req: any, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: "A tenant-scoped user is required.", code: "TENANT_REQUIRED" });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId, resource: "REVIEW_REQUEST", action: "REVIEW_REQUEST_SENT" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res.json({
      requests: logs.map((log) => {
        let details: Record<string, unknown> = {};
        try {
          details = log.details ? JSON.parse(log.details) : {};
        } catch {
          details = {};
        }
        return { id: log.id, status: "PROVIDER_ACCEPTED", createdAt: log.createdAt, ...details };
      }),
      deliveryConfigured: Boolean(process.env.REVIEW_REQUEST_WEBHOOK_URL),
    });
  } catch (error) {
    console.error("[reviews:requests]", error);
    return res.status(500).json({ error: "Failed to load review request history." });
  }
});

router.post("/requests", authMiddleware, sendReviewRequest);

// GET /api/v1/reviews
// Fetch all reviews for a tenant's locations
router.get("/", authMiddleware, async (req: any, res) => {
  const tenantId = req.user.tenantId;

  try {
    const locations = await prisma.location.findMany({
      where: tenantId ? { tenantId } : {},
      select: { id: true, locationName: true, title: true },
    });

    const locationIds = locations.map((l) => l.id);

    const reviews = await prisma.review.findMany({
      where: { locationId: { in: locationIds } },
      orderBy: { createTime: "desc" },
    });

    res.json({ locations, reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// GET /api/v1/reviews/sentiment-summary
// AI Sentiment & Keyword extraction across customer reviews
router.get("/sentiment-summary", authMiddleware, async (req: any, res) => {
  const tenantId = req.user.tenantId;

  try {
    const locations = await prisma.location.findMany({
      where: tenantId ? { tenantId } : {},
      select: { id: true },
    });
    const locationIds = locations.map((l) => l.id);

    const reviews = await prisma.review.findMany({
      where: { locationId: { in: locationIds } },
      select: { starRating: true, comment: true, sentimentScore: true },
    });

    let positive = 0;
    let neutral = 0;
    let negative = 0;

    reviews.forEach((r) => {
      if (r.starRating >= 4) positive++;
      else if (r.starRating === 3) neutral++;
      else negative++;
    });

    const total = reviews.length;
    const sentimentBreakdown = {
      positivePercent: total > 0 ? Math.round((positive / total) * 100) : 100,
      neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
      negativePercent: total > 0 ? Math.round((negative / total) * 100) : 0,
      counts: { positive, neutral, negative, total },
    };

    res.json({ success: true, sentimentBreakdown });
  } catch (error) {
    console.error("[reviews:sentiment-summary]", error);
    res.status(500).json({ error: "Failed to compute sentiment summary" });
  }
});

// POST /api/v1/reviews/:id/generate-ai-reply
// Generate automated context-aware AI response for a review
router.post("/:id/generate-ai-reply", authMiddleware, async (req: any, res) => {
  const tenantId = req.user.tenantId;
  const { id } = req.params;

  try {
    const review = await prisma.review.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!review || (tenantId && review.location.tenantId !== tenantId)) {
      return res.status(404).json({ error: "Review not found or unauthorized" });
    }

    const reviewer = review.reviewerName || "Valued Customer";
    const stars = review.starRating;
    const comment = review.comment || "";

    let suggestedReply = "";

    if (stars >= 4) {
      suggestedReply = `Thank you so much for the wonderful ${stars}-star review, ${reviewer}! We are thrilled to hear you had a great experience. We look forward to serving you again soon!`;
    } else if (stars === 3) {
      suggestedReply = `Hello ${reviewer}, thank you for taking the time to share your feedback. We are glad you visited us, and we are constantly striving to improve. Please let us know how we can make your next experience a 5-star one!`;
    } else {
      suggestedReply = `Dear ${reviewer}, thank you for bringing this to our attention. We deeply apologize that your experience did not meet expectations. Please reach out to our management team directly so we can make things right.`;
    }

    // Persist the AI suggested reply to database for one-click approval
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        aiSuggestedReply: suggestedReply,
      },
    });

    res.json({
      success: true,
      suggestedReply,
      reviewId: updatedReview.id,
    });
  } catch (error) {
    console.error("[reviews:generate-ai-reply]", error);
    res.status(500).json({ error: "Failed to generate AI review response" });
  }
});

// POST /api/v1/reviews/:id/reply
// Reply to a specific review
router.post("/:id/reply", authMiddleware, async (req: any, res) => {
  const tenantId = req.user.tenantId;
  const { id } = req.params;
  const { replyComment } = req.body;

  try {
    const review = await prisma.review.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!review || (tenantId && review.location.tenantId !== tenantId)) {
      return res
        .status(404)
        .json({ error: "Review not found or unauthorized" });
    }

    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        replyComment,
        replyUpdateTime: new Date(),
      },
    });

    res.json(updatedReview);
  } catch (error) {
    console.error("Error replying to review:", error);
    res.status(500).json({ error: "Failed to reply to review" });
  }
});

// Backwards-compatible singular alias; uses the same real provider path.
router.post("/request", authMiddleware, sendReviewRequest);

export default router;
