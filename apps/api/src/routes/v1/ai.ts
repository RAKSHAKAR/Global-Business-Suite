import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware, AuthRequest } from "../../middleware/auth";

const router = Router();

// Endpoint: Generate content via AI
// POST /api/v1/ai/generate
router.post("/generate", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId ?? undefined;
    const { prompt, modelKey, type } = req.body;

    if (!prompt || !modelKey) {
      return res
        .status(400)
        .json({ error: "Prompt and modelKey are required" });
    }

    // 1. Validate Tenant's Subscription
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: true },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // If tenant has an active subscription, we check allowed models
    // Option B: Grant access to all models if allowedModels is not explicitly set,
    // or if the plan has allowedModels, filter by it.
    let isAllowed = true;
    const activeSub = tenant.subscriptions[0];
    if (activeSub && activeSub.plan.allowedModels) {
      try {
        const allowed = JSON.parse(activeSub.plan.allowedModels) as string[];
        if (allowed.length > 0 && !allowed.includes(modelKey)) {
          isAllowed = false;
        }
      } catch (e) {
        console.error(
          "Error parsing allowedModels for plan",
          activeSub.plan.id,
        );
      }
    }

    if (!isAllowed) {
      return res
        .status(403)
        .json({
          error: `Model ${modelKey} is not allowed on your current plan.`,
        });
    }

    // 2. Fetch the requested AiModel to get the Provider ID
    const aiModel = await prisma.aiModel.findFirst({
      where: { modelKey },
      include: { provider: true },
    });

    if (!aiModel || !aiModel.provider || !aiModel.provider.isActive) {
      return res
        .status(400)
        .json({ error: "Selected model or provider is not active/available" });
    }

    // Check quota and active status for tenant
    const tenantAiConfig = await prisma.tenantAiConfig.findFirst({
      where: { tenantId, providerId: aiModel.providerId },
    });

    if (tenantAiConfig) {
      if (!tenantAiConfig.isActive) {
        return res
          .status(403)
          .json({ error: "This AI engine is disabled for your organization." });
      }
      if (
        tenantAiConfig.quotaMonthly > 0 &&
        tenantAiConfig.usageCurrent >= tenantAiConfig.quotaMonthly
      ) {
        return res
          .status(429)
          .json({
            error: `Monthly AI quota (${tenantAiConfig.quotaMonthly} requests) exceeded for your organization.`,
          });
      }
    }

    const providerKey = tenantAiConfig?.overrideKey || aiModel.provider.apiKey;
    if (!providerKey) {
      return res.status(500).json({ error: "Provider API key is missing" });
    }

    // 3. Call the external AI API
    let generatedContent = "";

    if (aiModel.provider.name.toLowerCase() === "google") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelKey}:generateContent?key=${providerKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Act as a marketing expert. Generate ${type || "CAPTION"} content for: ${prompt}`,
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("Google API Error:", err);
        return res
          .status(response.status)
          .json({ error: "Failed to generate content via Google AI" });
      }

      const data = await response.json();
      generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (aiModel.provider.name.toLowerCase() === "openai") {
      const response = await fetch(
        `https://api.openai.com/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${providerKey}`,
          },
          body: JSON.stringify({
            model: modelKey,
            messages: [
              {
                role: "user",
                content: `Act as a marketing expert. Generate ${type || "CAPTION"} content for: ${prompt}`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("OpenAI API Error:", err);
        return res
          .status(response.status)
          .json({ error: "Failed to generate content via OpenAI" });
      }

      const data = await response.json();
      generatedContent = data.choices?.[0]?.message?.content || "";
    } else {
      return res.status(400).json({ error: "Unsupported AI provider" });
    }

    // Update quota usage
    if (tenantAiConfig) {
      await prisma.tenantAiConfig.update({
        where: { id: tenantAiConfig.id },
        data: { usageCurrent: { increment: 1 } },
      });
    }

    // Save history
    const aiContent = await prisma.aiContent.create({
      data: {
        prompt,
        result: generatedContent,
        type: type || "CAPTION",
        ...(tenantId ? { tenantId } : {}),
      } as any,
    });

    return res.status(201).json(aiContent);
  } catch (error) {
    console.error("Error generating AI content:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint: List available AI models for the current tenant's subscription
// GET /api/v1/ai/models
router.get("/models", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId ?? undefined;

    // Check if tenant has any custom AI engine configs
    const allTenantConfigs = await prisma.tenantAiConfig.findMany({
      where: { tenantId },
    });

    let models;

    if (allTenantConfigs.length > 0) {
      // Filter models: only include providers that are active globally AND active for this tenant
      const activeProviderIds = allTenantConfigs
        .filter((c) => c.isActive)
        .map((c) => c.providerId);

      models = await prisma.aiModel.findMany({
        where: {
          isActive: true,
          providerId: { in: activeProviderIds },
          provider: { isActive: true },
        },
        include: { provider: true },
      });
    } else {
      // Default: No tenant-specific restriction configured, return models from all globally active providers
      models = await prisma.aiModel.findMany({
        where: {
          isActive: true,
          provider: { isActive: true },
        },
        include: { provider: true },
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: true },
          take: 1,
        },
      },
    });

    const activeSub = tenant?.subscriptions[0];
    if (activeSub && activeSub.plan.allowedModels) {
      try {
        const allowed = JSON.parse(activeSub.plan.allowedModels) as string[];
        // Filter models only if allowed array is not empty
        if (allowed.length > 0) {
          models = models.filter((m) => allowed.includes(m.modelKey));
        }
      } catch (e) {
        // Ignored
      }
    }

    res.json(models);
  } catch (error) {
    console.error("Error fetching AI models:", error);
    res.status(500).json({ error: "Failed to fetch AI models" });
  }
});

// Endpoint: List AI generation history
// GET /api/v1/ai/history
router.get("/history", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId ?? undefined;
    const content = await prisma.aiContent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json(content);
  } catch (error) {
    console.error("Error fetching AI history:", error);
    res.status(500).json({ error: "Failed to fetch AI content" });
  }
});

// Endpoint: Delete a history item
// DELETE /api/v1/ai/history/:id
router.delete("/history/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const tenantId = req.user?.tenantId ?? undefined;
    const { id } = req.params;

    // Ensure the content belongs to the tenant
    const content = await prisma.aiContent.findUnique({ where: { id } });
    if (!content || content.tenantId !== tenantId) {
      return res.status(404).json({ error: "Content not found" });
    }

    await prisma.aiContent.delete({ where: { id } });
    res.json({ message: "AI content deleted" });
  } catch (error) {
    console.error("Error deleting AI content:", error);
    res.status(500).json({ error: "Failed to delete AI content" });
  }
});

export default router;
