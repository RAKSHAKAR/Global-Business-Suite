import { prisma } from "@saas/database";
import { executeWithRetry } from "../../utils/retryEngine";
import { eventBus } from "../eventBus";

export class GBPServiceModule {
  public async getLocations(tenantId: string) {
    return prisma.location.findMany({
      where: { tenantId },
    });
  }

  public async syncLocationData(locationId: string, tenantId: string) {
    return executeWithRetry("gbp-sync-location", async () => {
      const location = await prisma.location.findFirst({
        where: { id: locationId, tenantId },
      });

      if (!location) {
        throw new Error("GBP location not found or access denied.");
      }

      await prisma.location.update({
        where: { id: locationId },
        data: {
          lastSyncAt: new Date(),
        },
      });

      eventBus.publish("gbp:synced", { locationId, tenantId }, { tenantId });
      return { status: "SUCCESS", syncedAt: new Date() };
    });
  }

  public async getReviews(tenantId: string, locationId?: string) {
    const where: any = { tenantId };
    if (locationId) where.locationId = locationId;

    return prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }
}

export const gbpServiceModule = new GBPServiceModule();
