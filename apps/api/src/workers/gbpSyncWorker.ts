/**
 * GBS GBP Background Sync Worker
 * Runs auto-sync for GBP locations, scheduled post publishing,
 * and automation rule execution.
 *
 * Uses setInterval for lightweight scheduling (replace with BullMQ for production).
 */

import { prisma } from "@saas/database";
import { googleBusinessProfileService } from "../services/googleBusinessProfileService";

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const POST_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const AUTOMATION_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let syncTimer: NodeJS.Timeout | null = null;
let postTimer: NodeJS.Timeout | null = null;
let automationTimer: NodeJS.Timeout | null = null;

// ─── GBP Scheduled Post Dispatcher ───────────────────────────────────────────

export async function dispatchScheduledGbpPosts() {
  try {
    const now = new Date();
    const duePosts = await prisma.gbpPost.findMany({
      where: {
        status: "SCHEDULED",
        approvalStatus: "APPROVED",
        scheduledAt: { lte: now },
      },
      select: { id: true, locationId: true },
    });

    if (duePosts.length === 0) return;
    console.info(`[gbpWorker] Dispatching ${duePosts.length} scheduled GBP posts`);

    for (const post of duePosts) {
      try {
        const result = await googleBusinessProfileService.publishScheduledPost(post.id);
        if (!result.skipped) {
          console.info(`[gbpWorker] Published GBP post ${post.id} for location ${post.locationId}`);
        }
      } catch (err) {
        console.error(`[gbpWorker] Failed to publish GBP post ${post.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[gbpWorker:dispatchGbpPosts] Error:", err);
  }
}

// ─── Social Post Dispatcher ───────────────────────────────────────────────────

export async function dispatchScheduledSocialPosts() {
  try {
    const now = new Date();
    const duePosts = await prisma.socialPost.findMany({
      where: {
        status: "SCHEDULED",
        approvalStatus: "APPROVED",
        scheduledAt: { lte: now },
      },
    });

    if (duePosts.length === 0) return;
    console.info(`[gbpWorker] Dispatching ${duePosts.length} scheduled social posts`);

    for (const post of duePosts) {
      try {
        const platforms: string[] = JSON.parse(post.platforms || "[]");
        if (platforms.length === 0) continue;

        // Get connected channels for this tenant
        const channels = await prisma.socialChannel.findMany({
          where: {
            tenantId: post.tenantId,
            platform: { in: platforms },
            isActive: true,
          },
        });

        // Mark as PUBLISHING
        await prisma.socialPost.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });

        // Import publisher dynamically to avoid circular import
        const { publishToAllChannels } = await import("../services/socialPublisher");
        const payload = {
          content: post.content,
          imageUrls: JSON.parse(post.imageUrls || "[]"),
          videoUrl: post.videoUrl || undefined,
          hashtags: JSON.parse(post.hashtags || "[]"),
          linkUrl: post.linkUrl || undefined,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = await publishToAllChannels(channels as any[], payload);

        // Save results
        if (results.length > 0) {
          await prisma.socialPostPlatformResult.createMany({
            data: results.map((r) => ({
              postId: post.id,
              platform: r.platform,
              channelId: r.channelId,
              status: r.status,
              externalPostId: r.externalPostId,
              externalUrl: r.externalUrl,
              error: r.error,
              publishedAt: r.publishedAt,
            })),
          });
        }

        const allPublished = results.length > 0 && results.every((r) => r.status === "PUBLISHED");
        const anyPublished = results.some((r) => r.status === "PUBLISHED");
        const finalStatus = allPublished ? "PUBLISHED" : anyPublished ? "PARTIALLY_PUBLISHED" : "FAILED";

        await prisma.socialPost.update({
          where: { id: post.id },
          data: { status: finalStatus, publishedAt: anyPublished ? new Date() : undefined },
        });

        console.info(`[gbpWorker] Social post ${post.id} → ${finalStatus}`);
      } catch (err) {
        console.error(`[gbpWorker] Failed to dispatch social post ${post.id}:`, err);
        await prisma.socialPost.update({ where: { id: post.id }, data: { status: "FAILED" } });
      }
    }
  } catch (err) {
    console.error("[gbpWorker:dispatchSocialPosts] Error:", err);
  }
}

// ─── Automation Rule Runner ───────────────────────────────────────────────────

async function runAutomationRules() {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { isActive: true },
    });

    if (rules.length === 0) return;

    for (const rule of rules) {
      try {
        await executeAutomationRule(rule);
      } catch (err) {
        console.error(`[gbpWorker:automation] Rule ${rule.id} failed:`, err);
      }
    }
  } catch (err) {
    console.error("[gbpWorker:automation] Error:", err);
  }
}

async function executeAutomationRule(rule: any) {
  const conditions = JSON.parse(rule.triggerConditions || "{}");
  const config = JSON.parse(rule.actionConfig || "{}");

  switch (rule.triggerType) {
    case "REVIEW_RATING_HIGH": {
      // Find high-rated reviews without replies
      const minRating = conditions.minRating || 4;
      const locations = await prisma.location.findMany({
        where: { tenantId: rule.tenantId },
        select: { id: true },
      });
      const locationIds = locations.map((l: any) => l.id);

      const reviews = await prisma.review.findMany({
        where: {
          locationId: { in: locationIds },
          starRating: { gte: minRating },
          replyComment: null,
          aiSuggestedReply: null,
        },
        take: 5, // Batch limit
      });

      if (reviews.length > 0 && rule.actionType === "REPLY_REVIEW_AI") {
        for (const review of reviews) {
          const reply = `Thank you so much for the wonderful ${review.starRating}-star review! We truly appreciate your support.`;
          await prisma.review.update({
            where: { id: review.id },
            data: { aiSuggestedReply: reply },
          });
        }
        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { lastRunAt: new Date(), runCount: { increment: reviews.length } },
        });
        console.info(`[gbpWorker:automation] Rule ${rule.name}: AI replies generated for ${reviews.length} reviews`);
      }
      break;
    }

    case "REVIEW_RATING_LOW": {
      const maxRating = conditions.maxRating || 2;
      // Log and potentially create support ticket
      if (rule.actionType === "CREATE_TICKET") {
        const locations = await prisma.location.findMany({ where: { tenantId: rule.tenantId }, select: { id: true } });
        const locationIds = locations.map((l: any) => l.id);
        const badReviews = await prisma.review.findMany({
          where: { locationId: { in: locationIds }, starRating: { lte: maxRating }, replyComment: null },
          take: 3,
        });
        if (badReviews.length > 0) {
          console.info(`[gbpWorker:automation] ${badReviews.length} low-rated reviews need attention for tenant ${rule.tenantId}`);
          await prisma.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date(), runCount: { increment: 1 } } });
        }
      }
      break;
    }

    default:
      // Other trigger types handled on-demand (via event hooks)
      break;
  }
}

// ─── GBP Location Sync ───────────────────────────────────────────────────────

async function checkTokenExpirations() {
  try {
    const expiringTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // within 7 days
    const expiringAccounts = await prisma.gbpAccount.findMany({
      where: {
        tokenExpiresAt: { lte: expiringTime },
        accountHealth: { not: "EXPIRED" },
      },
    });

    for (const acc of expiringAccounts) {
      const isExpired = acc.tokenExpiresAt ? acc.tokenExpiresAt <= new Date() : false;
      await prisma.gbpAccount.update({
        where: { id: acc.id },
        data: {
          accountHealth: isExpired ? "EXPIRED" : "EXPIRING",
          lastHealthCheckAt: new Date(),
        },
      });
      console.warn(`[gbpWorker] GBP Account ${acc.accountName} (${acc.id}) health marked as ${isExpired ? "EXPIRED" : "EXPIRING"}`);
    }
  } catch (err) {
    console.error("[gbpWorker:checkTokenExpirations] Error:", err);
  }
}

async function syncGbpLocations() {
  try {
    await checkTokenExpirations();

    const accounts = await prisma.gbpAccount.findMany({ select: { tenantId: true } });
    const tenantIds = Array.from(new Set(accounts.map((account) => account.tenantId)));
    for (const tenantId of tenantIds) {
      try {
        const result = await googleBusinessProfileService.syncTenant(tenantId);
        console.info(
          `[gbpWorker] Synced ${result.locations} GBP locations across ${result.accounts} accounts for tenant ${tenantId}`,
        );
      } catch (error) {
        console.error(`[gbpWorker] GBP sync failed for tenant ${tenantId}:`, error);
      }
    }
  } catch (err) {
    console.error("[gbpWorker:syncLocations] Error:", err);
  }
}

// ─── Worker Lifecycle ─────────────────────────────────────────────────────────

export function startGbpWorker() {
  console.info("[gbpWorker] Starting GBP background sync worker…");

  // Immediately run once on startup
  dispatchScheduledGbpPosts();

  // Scheduled post dispatch — check every minute
  postTimer = setInterval(async () => {
    await dispatchScheduledGbpPosts();
  }, POST_CHECK_INTERVAL_MS);

  // Location sync — every 30 minutes
  syncTimer = setInterval(syncGbpLocations, SYNC_INTERVAL_MS);

  // Automation rules — every 5 minutes
  automationTimer = setInterval(runAutomationRules, AUTOMATION_CHECK_INTERVAL_MS);

  console.info("[gbpWorker] Worker started — post dispatch every 1min, sync every 30min, automation every 5min");
}

export function stopGbpWorker() {
  if (postTimer) clearInterval(postTimer);
  if (syncTimer) clearInterval(syncTimer);
  if (automationTimer) clearInterval(automationTimer);
  console.info("[gbpWorker] Worker stopped");
}
