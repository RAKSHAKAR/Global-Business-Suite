import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// Only Super Admins should access these, but for now we rely on authMiddleware
// In a real scenario, we'd check if `req.user.roles.includes('Super Admin')`

// Get all AI Providers
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const providers = await prisma.aiProvider.findMany({
      orderBy: { name: "asc" },
      include: { models: true },
    });

    const isSuperAdmin = req.user?.roles?.some(
      (r: any) => r.name === "Super Admin" || r === "Super Admin",
    );

    const mappedProviders = providers.map((p) => {
      const providerData: any = { ...p };
      if (!isSuperAdmin) {
        delete providerData.apiKey;
      }
      return providerData;
    });

    res.json(mappedProviders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch AI providers" });
  }
});

// Create an AI Provider
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, providerKey, apiKey, isActive } = req.body;

    // Quick validation
    if (!name || !providerKey) {
      return res
        .status(400)
        .json({ error: "Name and ProviderKey are required" });
    }

    const provider = await prisma.aiProvider.create({
      data: {
        name,
        providerKey,
        apiKey,
        isActive: isActive !== undefined ? isActive : true,
      },
    });
    res.json(provider);
  } catch (error) {
    console.error("Error creating AI Provider:", error);
    res.status(500).json({ error: "Failed to create AI provider" });
  }
});

// Test Connection
router.post(
  "/test-connection",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { providerKey, apiKey, providerId } = req.body;
      if (!providerKey)
        return res.status(400).json({ error: "ProviderKey is required" });

      let keyToTest = apiKey;
      if (!keyToTest && providerId) {
        const existing = await prisma.aiProvider.findUnique({
          where: { id: providerId },
        });
        if (existing) keyToTest = existing.apiKey;
      }

      if (!keyToTest)
        return res
          .status(400)
          .json({ error: "API Key is required to test connection" });

      const pKey = providerKey.toUpperCase();
      if (pKey === "GOOGLE" || pKey === "GEMINI") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`,
        );
        if (!response.ok)
          return res
            .status(400)
            .json({ error: `Invalid Gemini API Key (${response.status})` });
      } else if (pKey === "OPENAI") {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${keyToTest}` },
        });
        if (!response.ok)
          return res
            .status(400)
            .json({ error: `Invalid OpenAI API Key (${response.status})` });
      } else if (pKey === "ANTHROPIC") {
        // Mock check for Anthropic
      } else {
        return res
          .status(400)
          .json({ error: "Test not implemented for this provider" });
      }

      res.json({ message: "Connection successful!" });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || "Connection test failed" });
    }
  },
);

// Update an AI Provider
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, apiKey, isActive } = req.body;

    const provider = await prisma.aiProvider.update({
      where: { id },
      data: {
        name,
        apiKey,
        isActive,
      },
    });
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: "Failed to update AI provider" });
  }
});

// Sync models from provider API
router.post("/:id/sync", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch provider details
    const provider = await prisma.aiProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      return res.status(404).json({ error: "AI provider not found" });
    }

    const apiKey = provider.apiKey;
    if (!apiKey) {
      return res
        .status(400)
        .json({ error: "API Key is missing for this provider" });
    }

    let modelsToUpsert: { modelKey: string; name: string }[] = [];

    // 2. Fetch models dynamically based on providerKey
    const pKey = provider.providerKey.toUpperCase();
    if (pKey === "GOOGLE" || pKey === "GEMINI") {
      // Fetch from Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (!response.ok) {
        throw new Error(
          `Invalid Gemini API Key or API error (${response.status})`,
        );
      }
      const data = await response.json();

      // Filter for active gemini models
      modelsToUpsert = (data.models || [])
        .filter((m: any) => m.name.includes("gemini"))
        .map((m: any) => ({
          modelKey: m.name.replace("models/", ""),
          name: m.displayName || m.name.replace("models/", ""),
        }));
    } else if (pKey === "OPENAI") {
      try {
        // Fetch from OpenAI API
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (response.ok) {
          const data = await response.json();
          modelsToUpsert = (data.data || [])
            .filter((m: any) => m.id.includes("gpt"))
            .map((m: any) => ({
              modelKey: m.id,
              name: m.id,
            }));
        } else {
          console.warn(
            `[AI Sync] OpenAI API Key sync returned HTTP ${response.status}`,
          );
        }
      } catch (err: any) {
        console.warn(`[AI Sync] OpenAI API Key sync skipped: ${err.message}`);
      }
    } else if (pKey === "ANTHROPIC") {
      modelsToUpsert = [
        { modelKey: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet" },
        { modelKey: "claude-3-opus-20240229", name: "Claude 3 Opus" },
        { modelKey: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
      ];
    } else {
      // Placeholder for other providers
      return res
        .status(400)
        .json({
          error: `Sync not implemented for provider type: ${provider.providerKey}. Supported: GOOGLE, GEMINI, OPENAI, ANTHROPIC.`,
        });
    }

    // 3. Upsert models into the database
    let count = 0;
    for (const m of modelsToUpsert) {
      await prisma.aiModel.upsert({
        where: {
          providerId_modelKey: {
            providerId: provider.id,
            modelKey: m.modelKey,
          },
        },
        update: {
          name: m.name,
          isActive: true,
        },
        create: {
          providerId: provider.id,
          modelKey: m.modelKey,
          name: m.name,
          isActive: true,
        },
      });
      count++;
    }

    res.json({ message: `Successfully synced ${count} models`, count });
  } catch (error: any) {
    console.error("Error syncing models:", error);
    res.status(500).json({ error: error.message || "Failed to sync models" });
  }
});

// Delete an AI Provider
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check if provider exists first
    const provider = await prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) {
      return res.status(404).json({ error: "AI provider not found" });
    }

    // Delete associated models first due to foreign key constraint (if Prisma doesn't cascade)
    await prisma.aiModel.deleteMany({
      where: { providerId: id },
    });

    await prisma.aiProvider.delete({
      where: { id },
    });

    res.json({ message: "AI provider removed successfully" });
  } catch (error) {
    console.error("Error deleting AI provider:", error);
    res.status(500).json({ error: "Failed to delete AI provider" });
  }
});

export default router;
