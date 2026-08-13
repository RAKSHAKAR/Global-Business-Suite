jest.mock("@saas/database", () => ({
  prisma: {
    gbpPost: { findMany: jest.fn() },
  },
}));

jest.mock("../services/googleBusinessProfileService", () => ({
  googleBusinessProfileService: {
    publishScheduledPost: jest.fn(),
  },
}));

import { prisma } from "@saas/database";
import { googleBusinessProfileService } from "../services/googleBusinessProfileService";
import { dispatchScheduledGbpPosts } from "../workers/gbpSyncWorker";

describe("GBP scheduled publishing worker", () => {
  test("queries only approved due posts and delegates real publication", async () => {
    (prisma.gbpPost.findMany as jest.Mock).mockResolvedValue([
      { id: "approved-post", locationId: "location-1" },
    ]);
    (googleBusinessProfileService.publishScheduledPost as jest.Mock).mockResolvedValue({
      skipped: false,
    });

    await dispatchScheduledGbpPosts();

    expect(prisma.gbpPost.findMany).toHaveBeenCalledWith({
      where: {
        status: "SCHEDULED",
        approvalStatus: "APPROVED",
        scheduledAt: { lte: expect.any(Date) },
      },
      select: { id: true, locationId: true },
    });
    expect(googleBusinessProfileService.publishScheduledPost).toHaveBeenCalledWith("approved-post");
  });
});

