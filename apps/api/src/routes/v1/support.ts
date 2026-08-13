import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { prisma } from "@saas/database";

const router = Router();

/**
 * @swagger
 * /support/tickets:
 *   get:
 *     summary: List support tickets for the authenticated tenant
 *     tags: [Support]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of tickets
 */
router.get("/tickets", authMiddleware, async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const where = tenantId ? { tenantId } : {};
    const tickets = await prisma.ticket.findMany({
      where,
      include: { messages: false },
      orderBy: { createdAt: "desc" },
    });
    res.json(tickets);
  } catch {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

/**
 * @swagger
 * /support/tickets:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Support]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject]
 *             properties:
 *               subject: { type: string }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
 *     responses:
 *       201:
 *         description: Ticket created
 */
router.post("/tickets", authMiddleware, async (req, res) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    const { subject, priority } = req.body;
    if (!subject) return res.status(400).json({ error: "subject is required" });
    const ticket = await prisma.ticket.create({
      data: { tenantId, subject, priority: priority || "MEDIUM" },
    });
    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

/**
 * @swagger
 * /support/knowledge-base:
 *   get:
 *     summary: List published knowledge base articles
 *     tags: [Support]
 *     responses:
 *       200:
 *         description: List of articles
 */
router.get("/knowledge-base", async (_req, res) => {
  try {
    const articles = await prisma.knowledgeBase.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(articles);
  } catch {
    res.status(500).json({ error: "Failed to fetch knowledge base" });
  }
});

export default router;
