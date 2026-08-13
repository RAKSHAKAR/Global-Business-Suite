import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { aiWorkflowEngine } from "../../services/ai/aiWorkflowEngine";

const router = Router();

// GET /api/v1/ai-workflows - List AI Workflows
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const workflows = await prisma.aiWorkflow.findMany({
      where: req.user?.tenantId ? { tenantId: req.user.tenantId } : {},
      include: { _count: { select: { runs: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(workflows);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch AI Workflows" });
  }
});

// POST /api/v1/ai-workflows - Create AI Workflow
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, triggerType, triggerConfig, steps, isActive } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const workflow = await prisma.aiWorkflow.create({
      data: {
        tenantId: req.user?.tenantId || null,
        name,
        description: description || null,
        triggerType: triggerType || "MANUAL",  // SCHEDULED, EVENT, WEBHOOK, MANUAL
        triggerConfigJson: triggerConfig ? JSON.stringify(triggerConfig) : "{}",
        stepsJson: steps ? JSON.stringify(steps) : "[]",
        isActive: isActive !== undefined ? isActive : true,
        createdByUserId: req.user?.id || null,
      },
    });

    res.status(201).json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create AI Workflow" });
  }
});

// PUT /api/v1/ai-workflows/:id - Update AI Workflow
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, triggerType, triggerConfig, steps, isActive } = req.body;

    const workflow = await prisma.aiWorkflow.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(triggerType && { triggerType }),
        ...(triggerConfig && { triggerConfigJson: JSON.stringify(triggerConfig) }),
        ...(steps && { stepsJson: JSON.stringify(steps) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(workflow);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update AI Workflow" });
  }
});

// POST /api/v1/ai-workflows/:id/trigger - Manually Trigger AI Workflow
router.post("/:id/trigger", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await aiWorkflowEngine.executeWorkflow(id, req.user?.tenantId ?? undefined);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to trigger AI Workflow" });
  }
});

// GET /api/v1/ai-workflows/:id/runs - Get Workflow Run History
router.get("/:id/runs", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const runs = await prisma.aiWorkflowRun.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch workflow runs" });
  }
});

// DELETE /api/v1/ai-workflows/:id - Delete AI Workflow
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.aiWorkflow.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete AI Workflow" });
  }
});

export default router;
