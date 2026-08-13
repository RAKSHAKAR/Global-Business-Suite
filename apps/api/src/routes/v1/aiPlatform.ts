import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { providerRouter } from "../../services/ai/providerRouter";
import { promptManager } from "../../services/ai/promptManager";
import { aiAnalyticsEngine } from "../../services/ai/aiAnalyticsEngine";
import { aiGovernanceEngine } from "../../services/ai/aiGovernanceEngine";

const router = Router();

// GET /api/v1/ai-platform/providers - List all AI Providers & Models
router.get("/providers", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const providers = await prisma.aiProvider.findMany({
      orderBy: { priority: "asc" },
      include: { models: true },
    });
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch AI Providers" });
  }
});

// GET /api/v1/ai-platform/models - List all AI Models across all providers
router.get("/models", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { providerKey } = req.query;
    const models = await prisma.aiModel.findMany({
      where: {
        isActive: true,
        ...(providerKey ? { provider: { providerKey: String(providerKey) } } : {}),
      },
      include: { provider: { select: { name: true, providerKey: true } } },
      orderBy: { name: "asc" },
    });
    res.json(models);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch AI Models" });
  }
});

// POST /api/v1/ai-platform/providers - Add/Update AI Provider
router.post("/providers", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, providerKey, apiType, baseUrl, organizationId, apiKey, priority, isActive, isSelfHosted } = req.body;
    if (!name || !providerKey) {
      return res.status(400).json({ error: "Name and ProviderKey are required" });
    }

    const provider = await prisma.aiProvider.upsert({
      where: { providerKey },
      update: {
        name,
        apiType: apiType || "OPENAI",
        baseUrl,
        organizationId,
        apiKey,
        priority: priority || 1,
        isActive: isActive !== undefined ? isActive : true,
        isSelfHosted: isSelfHosted || false,
      },
      create: {
        name,
        providerKey,
        apiType: apiType || "OPENAI",
        baseUrl,
        organizationId,
        apiKey,
        priority: priority || 1,
        isActive: isActive !== undefined ? isActive : true,
        isSelfHosted: isSelfHosted || false,
      },
    });

    res.json(provider);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save AI Provider" });
  }
});

// POST /api/v1/ai-platform/generate - Multi-provider completion generation
router.post("/generate", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { prompt, systemInstruction, modelKey, providerKey, temperature, maxTokens } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const response = await providerRouter.generateCompletion({
      tenantId: req.user?.tenantId ?? undefined,
      userId: req.user?.userId || req.user?.id,
      prompt,
      systemInstruction,
      modelKey,
      providerKey,
      temperature,
      maxTokens,
    });

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate completion" });
  }
});

// GET /api/v1/ai-platform/prompts - List Prompt Templates
router.get("/prompts", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { category } = req.query;
    const prompts = await prisma.promptTemplate.findMany({
      where: {
        ...(category ? { category: String(category) } : {}),
        ...(req.user?.tenantId ? { OR: [{ tenantId: req.user.tenantId }, { tenantId: null }] } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(prompts);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch prompt templates" });
  }
});

// POST /api/v1/ai-platform/prompts - Create or Update Prompt Template
router.post("/prompts", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { key, title, category, systemPrompt, userPrompt, variablesJson, modelKey } = req.body;
    if (!key || !title || !userPrompt) {
      return res.status(400).json({ error: "Key, Title, and UserPrompt are required" });
    }

    const prompt = await prisma.promptTemplate.upsert({
      where: { key },
      update: {
        title,
        category: category || "GENERAL",
        systemPrompt: systemPrompt || "You are an enterprise AI assistant.",
        userPrompt,
        variablesJson: variablesJson ? JSON.stringify(variablesJson) : "[]",
        modelKey: modelKey || "gemini-1.5-pro",
        tenantId: req.user?.tenantId ?? null,
      },
      create: {
        key,
        title,
        category: category || "GENERAL",
        systemPrompt: systemPrompt || "You are an enterprise AI assistant.",
        userPrompt,
        variablesJson: variablesJson ? JSON.stringify(variablesJson) : "[]",
        modelKey: modelKey || "gemini-1.5-pro",
        tenantId: req.user?.tenantId ?? null,
      },
    });

    res.json(prompt);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save prompt template" });
  }
});

// POST /api/v1/ai-platform/prompts/render - Render Prompt with Variables
router.post("/prompts/render", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { promptKey, templateId, variables } = req.body;
    const rendered = await promptManager.renderPrompt({
      promptKey,
      templateId,
      variables: variables || {},
      tenantId: req.user?.tenantId ?? undefined,
    });
    res.json(rendered);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to render prompt" });
  }
});

// GET /api/v1/ai-platform/analytics - AI Token Usage & Cost Analytics
router.get("/analytics", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const summary = await aiAnalyticsEngine.getAnalyticsSummary(req.user?.tenantId ?? undefined);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch AI analytics" });
  }
});

// GET /api/v1/ai-platform/governance & /api/v1/ai-platform/governance/policies - AI Governance & Safety Policies
const fetchGovernanceHandler = async (req: AuthRequest, res: any) => {
  try {
    const policies = await prisma.aiGovernancePolicy.findMany({
      where: req.user?.tenantId ? { OR: [{ tenantId: req.user.tenantId }, { tenantId: null }] } : {},
    });
    res.json(policies);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch governance policies" });
  }
};

router.get("/governance", authMiddleware, fetchGovernanceHandler);
router.get("/governance/policies", authMiddleware, fetchGovernanceHandler);

export default router;
