import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { agentExecutionEngine } from "../../services/ai/agentExecutionEngine";

const router = Router();

// GET /api/v1/ai-agents - List all configurable AI Agents
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const agents = await prisma.aiAgent.findMany({
      where: req.user?.tenantId ? { OR: [{ tenantId: req.user.tenantId }, { tenantId: null }] } : {},
      orderBy: { name: "asc" },
    });

    if (agents.length === 0) {
      // Return predefined catalog if DB table is empty
      const catalogKeys = [
        "MARKETING_AGENT", "SEO_AGENT", "CRM_AGENT", "SALES_AGENT", "SUPPORT_AGENT",
        "GBP_AGENT", "SOCIAL_AGENT", "ANALYTICS_AGENT", "BILLING_AGENT", "REVIEW_AGENT",
        "KNOWLEDGE_AGENT", "WORKFLOW_AGENT", "ADMIN_ASSISTANT", "PARTNER_ASSISTANT",
        "CUSTOMER_ASSISTANT", "DEVELOPER_ASSISTANT"
      ];
      const catalog = catalogKeys.map((key) => ({
        key,
        name: key.replace(/_/g, " ").replace("AGENT", "Agent").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        type: key.split("_")[0],
        description: `Enterprise AI Agent for ${key.replace(/_/g, " ")}`,
        isActive: true,
      }));
      return res.json(catalog);
    }

    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch AI agents" });
  }
});

// POST /api/v1/ai-agents/execute - Dispatch request to specific AI Agent
router.post("/execute", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { agentKey, userPrompt, contextData, knowledgeBaseId, useRag } = req.body;
    if (!agentKey || !userPrompt) {
      return res.status(400).json({ error: "AgentKey and userPrompt are required" });
    }

    const result = await agentExecutionEngine.executeAgent({
      agentKey,
      tenantId: req.user?.tenantId ?? undefined,
      userId: req.user?.userId || req.user?.id,
      userPrompt,
      contextData,
      knowledgeBaseId,
      useRag,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute AI agent" });
  }
});

// POST /api/v1/ai-agents - Create or Update AI Agent
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { key, name, type, description, systemPrompt, defaultModelKey, providerKey, temperature, maxTokens, toolsJson, knowledgeBaseIdsJson } = req.body;
    if (!key || !name || !systemPrompt) {
      return res.status(400).json({ error: "Key, Name, and SystemPrompt are required" });
    }

    const agent = await prisma.aiAgent.upsert({
      where: { key },
      update: {
        name,
        agentType: type || "GENERAL",
        description,
        systemPrompt,
        defaultModelKey: defaultModelKey || "gemini-1.5-pro",
        providerKey: providerKey || "gemini",
        temperature: temperature !== undefined ? temperature : 0.7,
        maxTokens: maxTokens || 2048,
        toolsJson: toolsJson ? JSON.stringify(toolsJson) : "[]",
        knowledgeBaseIdsJson: knowledgeBaseIdsJson ? JSON.stringify(knowledgeBaseIdsJson) : "[]",
        tenantId: req.user?.tenantId ?? null,
      },
      create: {
        key,
        name,
        agentType: type || "GENERAL",
        description,
        systemPrompt,
        defaultModelKey: defaultModelKey || "gemini-1.5-pro",
        providerKey: providerKey || "gemini",
        temperature: temperature !== undefined ? temperature : 0.7,
        maxTokens: maxTokens || 2048,
        toolsJson: toolsJson ? JSON.stringify(toolsJson) : "[]",
        knowledgeBaseIdsJson: knowledgeBaseIdsJson ? JSON.stringify(knowledgeBaseIdsJson) : "[]",
        tenantId: req.user?.tenantId ?? null,
      },
    });

    res.json(agent);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save AI agent" });
  }
});

export default router;
