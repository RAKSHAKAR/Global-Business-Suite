import { Router } from "express";
import { prisma } from "@saas/database";

const router = Router();

// Get latest releases (public/unauthenticated for mobile app startup checks)
router.get("/latest", async (req, res) => {
  try {
    const { platform, appType } = req.query;

    if (!platform || !appType) {
      return res.status(400).json({ error: "Missing platform or appType" });
    }

    const release = await prisma.appRelease.findFirst({
      where: {
        platform: String(platform).toUpperCase(),
        appType: String(appType).toUpperCase(),
        status: "PRODUCTION",
      },
      orderBy: {
        buildNumber: "desc",
      },
    });

    if (!release) {
      return res.status(404).json({ error: "No releases found" });
    }

    res.json(release);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin ONLY: Get all releases
router.get("/", async (req, res) => {
  try {
    const releases = await prisma.appRelease.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(releases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin ONLY: Create new release
router.post("/", async (req, res) => {
  try {
    const {
      appType,
      platform,
      version,
      buildNumber,
      isMandatory,
      releaseNotes,
      status,
      downloadUrl,
      minimumOs,
    } = req.body;

    const release = await prisma.appRelease.create({
      data: {
        appType,
        platform,
        version,
        buildNumber: Number(buildNumber),
        isMandatory: Boolean(isMandatory),
        releaseNotes,
        status: status || "BETA",
        downloadUrl,
        minimumOs,
      },
    });

    res.status(201).json(release);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin ONLY: Update release
router.put("/:id", async (req, res) => {
  try {
    const { status, isMandatory, releaseNotes, downloadUrl } = req.body;

    const release = await prisma.appRelease.update({
      where: { id: req.params.id },
      data: {
        status,
        isMandatory,
        releaseNotes,
        downloadUrl,
      },
    });

    res.json(release);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin ONLY: Delete release
router.delete("/:id", async (req, res) => {
  try {
    await prisma.appRelease.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
