import { Queue, Worker, Job } from "bullmq";
import { google } from "googleapis";
import { prisma } from "@saas/database";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

// Queue for syncing Google Business data
export const googleSyncQueue = new Queue("google-sync", { connection });

// Initialize the worker
export const googleSyncWorker = new Worker(
  "google-sync",
  async (job: Job) => {
    const { tenantId, userId, type } = job.data;

    console.log(
      `[GoogleSync] Starting sync job ${job.id} for tenant ${tenantId}, type: ${type}`,
    );

    try {
      // 1. Get user's Google OAuth tokens
      const providerAccount = await prisma.providerAccount.findFirst({
        where: {
          userId,
          provider: "google",
        },
      });

      if (!providerAccount || !providerAccount.access_token) {
        throw new Error(`No Google OAuth tokens found for user ${userId}`);
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );

      oauth2Client.setCredentials({
        access_token: providerAccount.access_token,
        refresh_token: providerAccount.refresh_token,
      });

      const mybusinessbusinessinformation =
        google.mybusinessbusinessinformation({
          version: "v1",
          auth: oauth2Client,
        });

      // 2. Execute sync logic based on type
      if (type === "LOCATIONS") {
        // Mocking the call since this is an MVP phase and requires a verified Google account
        console.log("[GoogleSync] Fetching accounts and locations...");

        // Real API call would look like this:
        // const accountsRes = await google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client }).accounts.list();
        // const locationsRes = await mybusinessbusinessinformation.accounts.locations.list({ parent: 'accounts/123' });

        // Mock processing logic:
        console.log("[GoogleSync] Saving mock locations to database");
        await prisma.location.upsert({
          where: { googleLocationId: "locations/mock-123" },
          update: {
            lastSyncAt: new Date(),
          },
          create: {
            tenantId,
            googleLocationId: "locations/mock-123",
            locationName: "Mock Bakery Downtown",
            title: "Mock Bakery Downtown",
            address: "123 Main St",
          },
        });
      } else if (type === "REVIEWS") {
        console.log("[GoogleSync] Fetching reviews for locations...");
        // MOCK logic to simulate fetching reviews
        const locations = await prisma.location.findMany({
          where: { tenantId },
        });
        for (const loc of locations) {
          await prisma.review.upsert({
            where: { googleReviewId: `review-mock-${loc.id}-1` },
            update: {
              updateTime: new Date(),
            },
            create: {
              locationId: loc.id,
              googleReviewId: `review-mock-${loc.id}-1`,
              reviewerName: "John Doe",
              starRating: 5,
              comment: "Great place, love the service!",
              createTime: new Date(),
            },
          });
        }
      }

      console.log(`[GoogleSync] Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`[GoogleSync] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  { connection },
);

// Handle worker events
googleSyncWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

googleSyncWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
