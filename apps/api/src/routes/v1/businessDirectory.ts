import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { BusinessDirectoryService } from "../../services/businessDirectoryService";
import { auditLog } from "../../services/auditLogger";

const router = Router();

// GET /api/v1/business-directory/platforms
router.get("/platforms", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const platforms = await BusinessDirectoryService.getDirectoryPlatforms(tenantId);
    res.json({ success: true, count: platforms.length, data: platforms });
  } catch (err: any) {
    console.error("[businessDirectory:platforms]", err);
    res.status(500).json({ error: "Failed to fetch directory platforms" });
  }
});

// POST /api/v1/business-directory/listings
router.post("/listings", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "default-tenant";
    const { providerKey, businessName, address, phone, websiteUrl, externalListingId, metadata } = req.body;

    if (!providerKey || !businessName) {
      return res.status(400).json({ error: "providerKey and businessName are required" });
    }

    const listing = await BusinessDirectoryService.upsertListing(tenantId, providerKey, {
      businessName,
      address,
      phone,
      websiteUrl,
      externalListingId,
      metadata,
    });

    await auditLog((req as any).user?.userId, tenantId, "DIRECTORY_LISTING_CONNECTED", "BusinessDirectoryListing", listing.id, { providerKey, businessName }, req);

    res.status(201).json({ success: true, data: listing });
  } catch (err: any) {
    console.error("[businessDirectory:listings:create]", err);
    res.status(500).json({ error: "Failed to create directory listing" });
  }
});

// POST /api/v1/business-directory/sync
router.post("/sync", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || "default-tenant";
    const syncResult = await BusinessDirectoryService.syncAllDirectories(tenantId);
    await auditLog((req as any).user?.userId, tenantId, "DIRECTORY_SYNC_TRIGGERED", "BusinessDirectoryListing", tenantId, {}, req);
    res.json(syncResult);
  } catch (err: any) {
    console.error("[businessDirectory:sync]", err);
    res.status(500).json({ error: "Directory synchronization failed" });
  }
});

export default router;
