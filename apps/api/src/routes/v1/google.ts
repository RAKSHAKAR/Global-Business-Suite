import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import {
  GoogleBusinessProfileError,
  googleBusinessProfileService,
} from "../../services/googleBusinessProfileService";

const router = Router();

function authContext(req: Request) {
  const user = (req as any).user || {};
  return {
    userId: user.userId || user.id || "",
    tenantId: user.tenantId || "",
  };
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
  console.error(`[google] ${fallback}`, error);
  return res.status(500).json({
    success: false,
    error: fallback,
    code: "GOOGLE_BUSINESS_INTERNAL_ERROR",
  });
}

// GET /api/v1/google/auth - issue a signed, expiring, tenant-bound OAuth request.
router.get("/auth", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = authContext(req);
    if (!userId || !tenantId) {
      return res.status(400).json({
        success: false,
        error: "A tenant-scoped authenticated user is required.",
        code: "GOOGLE_TENANT_CONTEXT_REQUIRED",
      });
    }
    const url = await googleBusinessProfileService.createAuthorizationUrl(userId, tenantId);
    return res.json({ success: true, url, expiresInSeconds: 600 });
  } catch (error) {
    return sendGoogleError(res, error, "Failed to start Google Business authorization.");
  }
});

// GET /api/v1/google/callback - exchange the code, encrypt tokens, and discover real profiles.
router.get("/callback", async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const oauthError = typeof req.query.error === "string" ? req.query.error : "";
  if (oauthError) {
    return res.status(400).json({
      success: false,
      error: `Google authorization was not completed: ${oauthError}`,
      code: "GOOGLE_OAUTH_DENIED",
    });
  }

  try {
    const connected = await googleBusinessProfileService.completeOAuth(code, state);
    const accountCount = connected.accounts.length;
    const locationCount = connected.totalLocations;
    return res
      .status(200)
      .type("html")
      .send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Google Business connected</title></head>
  <body style="font-family:system-ui,sans-serif;max-width:560px;margin:64px auto;padding:24px;color:#0f172a">
    <h1>Google Business Profile connected</h1>
    <p>Discovered ${accountCount} account${accountCount === 1 ? "" : "s"} and ${locationCount} location${locationCount === 1 ? "" : "s"}.</p>
    <p>You can close this window and return to GBS.</p>
  </body>
</html>`);
  } catch (error) {
    return sendGoogleError(res, error, "Failed to complete Google Business authorization.");
  }
});

// GET /api/v1/google/dashboard - derived only from synchronized tenant data.
router.get("/dashboard", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenantId } = authContext(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "A tenant-scoped authenticated user is required.",
        code: "GOOGLE_TENANT_CONTEXT_REQUIRED",
      });
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [accounts, locations, insights, pendingReviews, recentPosts, recentMedia] = await Promise.all([
      prisma.gbpAccount.findMany({
        where: { tenantId },
        select: { id: true, accountHealth: true, lastHealthCheckAt: true },
      }),
      prisma.location.findMany({
        where: { tenantId },
        select: { id: true, verificationStatus: true, lastSyncAt: true },
      }),
      prisma.gbpInsight.findMany({
        where: { location: { tenantId }, date: { gte: since } },
        orderBy: { date: "asc" },
      }),
      prisma.review.count({ where: { tenantId, replyComment: null } }),
      prisma.gbpPost.count({
        where: { location: { tenantId }, status: "PUBLISHED", publishedAt: { gte: since } },
      }),
      prisma.gbpMedia.count({ where: { location: { tenantId }, createdAt: { gte: since } } }),
    ]);

    const byDate = new Map<string, { date: string; views: number; reviews: number; leads: number }>();
    for (const insight of insights) {
      const date = insight.date.toISOString().slice(0, 10);
      const current = byDate.get(date) || { date, views: 0, reviews: 0, leads: 0 };
      current.views += insight.businessImpressions;
      current.reviews += insight.reviewCount;
      current.leads +=
        insight.callClicks +
        insight.websiteClicks +
        insight.directionRequests +
        insight.bookingClicks +
        insight.foodOrderClicks;
      byDate.set(date, current);
    }
    const performanceTrend = Array.from(byDate.values());
    const totals = performanceTrend.reduce(
      (sum, day) => ({
        views: sum.views + day.views,
        reviews: sum.reviews + day.reviews,
        leads: sum.leads + day.leads,
      }),
      { views: 0, reviews: 0, leads: 0 },
    );
    const completedChecks = [
      accounts.length > 0,
      locations.some((location) => location.verificationStatus === "VERIFIED"),
      recentPosts > 0,
      recentMedia > 0,
      pendingReviews === 0,
    ];
    const pending = [
      ...(accounts.length ? [] : ["Connect a Google Business Profile account"]),
      ...(locations.some((location) => location.verificationStatus === "VERIFIED")
        ? []
        : ["Verify and select at least one business location"]),
      ...(recentPosts ? [] : ["Publish an approved Google Business post"]),
      ...(recentMedia ? [] : ["Upload current business media"]),
      ...(pendingReviews ? [`Reply to ${pendingReviews} pending review${pendingReviews === 1 ? "" : "s"}`] : []),
    ];

    return res.json({
      success: true,
      source: "SYNCED_GOOGLE_BUSINESS_DATA",
      isConnected: accounts.length > 0,
      connectionRequired: accounts.length === 0,
      marketingScore: completedChecks.filter(Boolean).length * 20,
      performance: { trend: performanceTrend, totals },
      growthActions: {
        total: completedChecks.length,
        completed: completedChecks.filter(Boolean).length,
        pending,
      },
      sync: {
        accounts: accounts.length,
        locations: locations.length,
        lastSyncedAt:
          locations.map((location) => location.lastSyncAt).filter(Boolean).sort().at(-1) || null,
      },
    });
  } catch (error) {
    return sendGoogleError(res, error, "Failed to load synchronized Google Business dashboard data.");
  }
});

// GET /api/v1/google/detect-profiles - refresh and persist real accounts/locations.
router.get("/detect-profiles", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId, tenantId } = authContext(req);
    if (!userId || !tenantId) {
      return res.status(400).json({
        success: false,
        error: "A tenant-scoped authenticated user is required.",
        code: "GOOGLE_TENANT_CONTEXT_REQUIRED",
      });
    }
    const accounts = await googleBusinessProfileService.discoverForUser(userId, tenantId);
    return res.json({
      success: true,
      source: "GOOGLE_BUSINESS_API",
      totalBusinessAccounts: accounts.length,
      totalLocations: accounts.reduce((count, account) => count + account.locations.length, 0),
      accounts,
    });
  } catch (error) {
    return sendGoogleError(res, error, "Failed to discover Google Business profiles.");
  }
});

// POST /api/v1/google/select-profiles - enable only already-discovered tenant locations.
router.post("/select-profiles", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tenantId } = authContext(req);
    const selectedLocationIds = req.body?.selectedLocationIds;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: "A tenant-scoped authenticated user is required.",
        code: "GOOGLE_TENANT_CONTEXT_REQUIRED",
      });
    }
    if (
      !Array.isArray(selectedLocationIds) ||
      selectedLocationIds.some((id) => typeof id !== "string" || !id.trim()) ||
      selectedLocationIds.length > 500
    ) {
      return res.status(400).json({
        success: false,
        error: "selectedLocationIds must be an array of at most 500 non-empty location IDs.",
        code: "GOOGLE_LOCATION_SELECTION_INVALID",
      });
    }
    const uniqueIds = Array.from(new Set(selectedLocationIds.map((id: string) => id.trim())));
    const existing = await prisma.location.findMany({
      where: { tenantId, googleLocationId: { in: uniqueIds } },
      select: { id: true, googleLocationId: true },
    });
    if (existing.length !== uniqueIds.length) {
      const found = new Set(existing.map((location) => location.googleLocationId));
      return res.status(404).json({
        success: false,
        error: "One or more selected profiles were not discovered for this tenant.",
        code: "GOOGLE_LOCATION_NOT_FOUND",
        missingLocationIds: uniqueIds.filter((id) => !found.has(id)),
      });
    }

    await prisma.$transaction([
      prisma.location.updateMany({ where: { tenantId }, data: { isSyncEnabled: false } }),
      prisma.location.updateMany({
        where: { tenantId, googleLocationId: { in: uniqueIds } },
        data: { isSyncEnabled: true },
      }),
    ]);
    const profiles = await prisma.location.findMany({
      where: { tenantId, googleLocationId: { in: uniqueIds } },
      orderBy: { title: "asc" },
    });
    return res.json({
      success: true,
      selectedCount: profiles.length,
      profiles,
    });
  } catch (error) {
    return sendGoogleError(res, error, "Failed to select Google Business profiles.");
  }
});

export default router;
