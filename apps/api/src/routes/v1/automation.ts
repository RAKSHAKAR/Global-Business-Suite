import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { auditLog } from "../../services/auditLogger";

const router = Router();

function tid(req: Request): string {
  return (req as any).user?.tenantId || "";
}

// GET /api/v1/automation
router.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { tenantId: tid(req) },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: rules });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch automation rules" });
  }
});

// POST /api/v1/automation
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, triggerType, triggerConditions, actionType, actionConfig, isActive } = req.body;
    if (!name || !triggerType || !actionType) {
      return res.status(400).json({ error: "name, triggerType, and actionType are required" });
    }

    const rule = await prisma.automationRule.create({
      data: {
        tenantId: tid(req),
        name,
        description,
        triggerType,
        triggerConditions: JSON.stringify(triggerConditions || {}),
        actionType,
        actionConfig: JSON.stringify(actionConfig || {}),
        isActive: isActive !== false,
      },
    });
    await auditLog((req as any).user?.userId, tid(req), "AUTOMATION_RULE_CREATED", "AutomationRule", rule.id, { name, triggerType, actionType }, req);
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: "Failed to create rule" });
  }
});

// PUT /api/v1/automation/:id
router.put("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, triggerType, triggerConditions, actionType, actionConfig, isActive } = req.body;
    const rule = await prisma.automationRule.updateMany({
      where: { id: req.params.id, tenantId: tid(req) },
      data: {
        name, description, triggerType, actionType,
        triggerConditions: triggerConditions ? JSON.stringify(triggerConditions) : undefined,
        actionConfig: actionConfig ? JSON.stringify(actionConfig) : undefined,
        isActive,
      },
    });
    res.json({ success: true, updated: rule.count });
  } catch (err) {
    res.status(500).json({ error: "Failed to update rule" });
  }
});

// PATCH /api/v1/automation/:id/toggle
router.patch("/:id/toggle", authMiddleware, async (req: Request, res: Response) => {
  try {
    const current = await prisma.automationRule.findFirst({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!current) return res.status(404).json({ error: "Rule not found" });
    const updated = await prisma.automationRule.update({
      where: { id: req.params.id },
      data: { isActive: !current.isActive },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle rule" });
  }
});

// DELETE /api/v1/automation/:id
router.delete("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    await prisma.automationRule.deleteMany({ where: { id: req.params.id, tenantId: tid(req) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

// POST /api/v1/automation/:id/test — Test run a rule manually
router.post("/:id/test", authMiddleware, async (req: Request, res: Response) => {
  try {
    const rule = await prisma.automationRule.findFirst({ where: { id: req.params.id, tenantId: tid(req) } });
    if (!rule) return res.status(404).json({ error: "Rule not found" });

    const conditions = JSON.parse(rule.triggerConditions || "{}");
    const config = JSON.parse(rule.actionConfig || "{}");

    // Simulate execution for test
    const testResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      triggerType: rule.triggerType,
      actionType: rule.actionType,
      conditions,
      config,
      executedAt: new Date(),
      result: "TEST_SUCCESS",
      message: `Rule "${rule.name}" test executed successfully. In production, this would trigger: ${rule.actionType}`,
    };

    // Update run count
    await prisma.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date(), runCount: { increment: 1 } } });

    res.json(testResult);
  } catch (err) {
    res.status(500).json({ error: "Failed to test rule" });
  }
});

export default router;
