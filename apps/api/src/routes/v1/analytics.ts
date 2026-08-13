import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

/**
 * GET /api/v1/analytics/dashboard
 * Fetch real-time KPI metrics, sentiment trends, and AI strategic insights for tenant dashboard
 */
router.get("/dashboard", authMiddleware, async (req: any, res) => {
  const tenantId = req.user.tenantId;

  try {
    // 1. Fetch locations for tenant
    const locations = await prisma.location.findMany({
      where: tenantId ? { tenantId } : {},
      select: { id: true },
    });
    const locationIds = locations.map((l) => l.id);

    // 2. Parallel data aggregation across core models
    const [
      totalReviews,
      avgRatingAgg,
      unrepliedReviews,
      aiContentGenerated,
      publishedPosts,
      scheduledPosts,
      draftPosts,
      totalLeads,
      activeClients,
      auditEventsCount,
    ] = await Promise.all([
      prisma.review.count({ where: { locationId: { in: locationIds } } }),
      prisma.review.aggregate({
        where: { locationId: { in: locationIds } },
        _avg: { starRating: true },
      }),
      prisma.review.count({
        where: { locationId: { in: locationIds }, replyComment: null },
      }),
      prisma.aiContent.count({ where: tenantId ? { tenantId } : {} }),
      prisma.socialPost.count({
        where: { ...(tenantId ? { tenantId } : {}), status: "PUBLISHED" },
      }),
      prisma.socialPost.count({
        where: { ...(tenantId ? { tenantId } : {}), status: "SCHEDULED" },
      }),
      prisma.socialPost.count({
        where: { ...(tenantId ? { tenantId } : {}), status: "DRAFT" },
      }),
      prisma.client.count({
        where: { ...(tenantId ? { tenantId } : {}), status: "LEAD" },
      }),
      prisma.client.count({
        where: { ...(tenantId ? { tenantId } : {}), status: "ACTIVE" },
      }),
      prisma.auditLog.count({ where: tenantId ? { tenantId } : {} }),
    ]);

    const avgStarRating = Math.round((avgRatingAgg._avg.starRating || 5.0) * 10) / 10;
    const responseRate = totalReviews > 0
      ? Math.round(((totalReviews - unrepliedReviews) / totalReviews) * 100)
      : 100;

    // 3. Compute dynamic GBS Health & Marketing Score (0-100)
    let marketingScore = 70; // baseline
    if (avgStarRating >= 4.5) marketingScore += 10;
    if (responseRate >= 80) marketingScore += 10;
    if (aiContentGenerated > 5) marketingScore += 5;
    if (publishedPosts > 0) marketingScore += 5;
    marketingScore = Math.min(100, marketingScore);

    // 4. Generate AI Strategic Recommendations based on real metrics
    const aiStrategicInsights: string[] = [];
    if (unrepliedReviews > 0) {
      aiStrategicInsights.push(
        `Action Required: ${unrepliedReviews} review(s) are awaiting replies. Responding within 24 hours improves local SEO ranking by up to 18%.`
      );
    }
    if (scheduledPosts === 0) {
      aiStrategicInsights.push(
        "Content Pipeline Empty: No upcoming social posts scheduled. Use GBS AI Studio to generate this week's content grid."
      );
    }
    if (aiContentGenerated < 10) {
      aiStrategicInsights.push(
        "Productivity Boost: Leverage Multi-LLM Orchestration (Gemini / Claude / OpenAI) to automate client emails and marketing posts."
      );
    }
    if (aiStrategicInsights.length === 0) {
      aiStrategicInsights.push(
        "Platform Optimized: High review response rate and active social media presence detected."
      );
    }

    res.json({
      success: true,
      marketingScore,
      metrics: {
        totalReviews,
        avgStarRating,
        responseRatePercent: responseRate,
        unrepliedReviews,
        aiContentGenerated,
        socialPosts: {
          published: publishedPosts,
          scheduled: scheduledPosts,
          draft: draftPosts,
          total: publishedPosts + scheduledPosts + draftPosts,
        },
        clients: {
          leads: totalLeads,
          active: activeClients,
          total: totalLeads + activeClients,
        },
        auditEventsCount,
      },
      locationsCount: locations.length,
      aiStrategicInsights,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[analytics:dashboard]", error);
    res.status(500).json({ error: "Failed to compute real-time analytics" });
  }
});

export default router;

