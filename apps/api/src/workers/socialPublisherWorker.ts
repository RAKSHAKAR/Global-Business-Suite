import { prisma } from "@saas/database";
import { publishToAllChannels, validateChannelHealth, type SocialChannelCredentials } from "../services/socialPublisher";

export class SocialPublisherWorker {
  private static timer: NodeJS.Timeout | null = null;

  static start() {
    if (this.timer) return;
    const interval = Math.max(10_000, Number(process.env.SOCIAL_PUBLISHER_INTERVAL_MS || 60_000));
    void this.runWorkerCycle();
    this.timer = setInterval(() => void this.runWorkerCycle(), interval);
    console.info(`[socialPublisherWorker] Started with ${interval}ms interval`);
  }

  static stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Main cron worker tick (runs every 1 minute)
   */
  static async runWorkerCycle() {
    try {
      await this.processScheduledPosts();
      await this.checkChannelHealth();
    } catch (err) {
      console.error("[socialPublisherWorker:error]", err);
    }
  }

  /**
   * Process all pending scheduled posts
   */
  private static async processScheduledPosts() {
    const now = new Date();
    const duePosts = await prisma.socialPost.findMany({
      where: {
        scheduledAt: { lte: now },
        status: "SCHEDULED",
        approvalStatus: "APPROVED",
      },
      include: { platformResults: true },
      take: 20,
    });

    if (duePosts.length === 0) return;

    console.info(`[socialPublisherWorker] Processing ${duePosts.length} due scheduled posts`);

    for (const post of duePosts) {
      try {
        await prisma.socialPost.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });

        const platforms: any[] = JSON.parse(post.platforms || "[]");
        const channels = await prisma.socialChannel.findMany({
          where: { tenantId: post.tenantId, platform: { in: platforms }, isActive: true },
        });

        const connectedPlatforms = new Set(channels.map((channel) => channel.platform));
        const hasEverySelectedPlatform = platforms.length > 0 && platforms.every((platform) => connectedPlatforms.has(platform));
        if (!hasEverySelectedPlatform) {
          await prisma.socialPost.update({
            where: { id: post.id },
            data: { status: "FAILED" },
          });
          continue;
        }

        const payload = {
          content: post.content,
          postType: post.postType as any,
          imageUrls: JSON.parse(post.imageUrls || "[]"),
          videoUrl: post.videoUrl || undefined,
          hashtags: JSON.parse(post.hashtags || "[]"),
          linkUrl: post.linkUrl || undefined,
          utmParams: JSON.parse(post.utmParamsJson || "{}"),
        };

        const results = await publishToAllChannels(channels as SocialChannelCredentials[], payload);

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

        const allPublished = results.length > 0 && results.every((r) => r.status === "PUBLISHED");
        const anyPublished = results.some((r) => r.status === "PUBLISHED");
        const finalStatus = allPublished ? "PUBLISHED" : anyPublished ? "PARTIALLY_PUBLISHED" : "FAILED";

        await prisma.socialPost.update({
          where: { id: post.id },
          data: { status: finalStatus, publishedAt: anyPublished ? new Date() : undefined },
        });
      } catch (e: any) {
        console.error(`[socialPublisherWorker:post:${post.id}]`, e);
        await prisma.socialPost.update({ where: { id: post.id }, data: { status: "FAILED" } });
      }
    }
  }

  /**
   * Monitor OAuth channel health and token expiration
   */
  private static async checkChannelHealth() {
    const channels = await prisma.socialChannel.findMany({ where: { isActive: true } });
    for (const ch of channels) {
      const health = validateChannelHealth(ch as SocialChannelCredentials);
      if (health.status !== ch.healthStatus) {
        await prisma.socialChannel.update({
          where: { id: ch.id },
          data: { healthStatus: health.status, lastHealthCheckAt: new Date() },
        });
      }
    }
  }
}
