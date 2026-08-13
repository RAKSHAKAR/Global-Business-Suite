import { Router } from "express";
import { prisma } from "@saas/database";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { ragVectorEngine } from "../../services/ai/ragVectorEngine";

const router = Router();

// GET /api/v1/ai-knowledge & /api/v1/ai-knowledge/bases - List Knowledge Bases
const listBasesHandler = async (req: AuthRequest, res: any) => {
  try {
    const bases = await prisma.aiKnowledgeBase.findMany({
      where: req.user?.tenantId
        ? { OR: [{ tenantId: req.user.tenantId }, { tenantId: null }] }
        : {},
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(bases);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch Knowledge Bases" });
  }
};

router.get("/", authMiddleware, listBasesHandler);
router.get("/bases", authMiddleware, listBasesHandler);

// POST /api/v1/ai-knowledge/bases - Create Knowledge Base
router.post("/bases", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const base = await prisma.aiKnowledgeBase.create({
      data: {
        tenantId: req.user?.tenantId || null,
        name,
        description: description || null,
        category: category || "GENERAL",
      },
    });

    res.status(201).json(base);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create Knowledge Base" });
  }
});

// DELETE /api/v1/ai-knowledge/bases/:id - Delete Knowledge Base
router.delete("/bases/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await prisma.aiKnowledgeBase.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete Knowledge Base" });
  }
});

// POST /api/v1/ai-knowledge/documents - Upload & Index Document
router.post("/documents", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { knowledgeBaseId, title, content, fileType, fileUrl } = req.body;
    if (!knowledgeBaseId || !title || !content) {
      return res.status(400).json({ error: "KnowledgeBaseId, Title, and Content are required" });
    }

    const indexed = await ragVectorEngine.processAndIndexDocument({
      knowledgeBaseId,
      tenantId: req.user?.tenantId ?? undefined,
      title,
      content,
      fileType,
      fileUrl,
    });

    res.status(201).json(indexed);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process and index document" });
  }
});

// GET /api/v1/ai-knowledge/documents/:knowledgeBaseId - List Documents in KB
router.get("/documents/:knowledgeBaseId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { knowledgeBaseId } = req.params;
    const docs = await prisma.aiDocument.findMany({
      where: {
        knowledgeBaseId,
        ...(req.user?.tenantId ? { tenantId: req.user.tenantId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// POST /api/v1/ai-knowledge/query - Perform Semantic RAG Vector Search
router.post("/query", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { knowledgeBaseId, query, topK } = req.body;
    if (!query) return res.status(400).json({ error: "Query string is required" });

    const results = await ragVectorEngine.queryKnowledgeBase({
      knowledgeBaseId,
      tenantId: req.user?.tenantId ?? undefined,
      query,
      topK: topK || 3,
    });

    const answer = results.chunks.length > 0
      ? results.chunks.map((c: any) => c.content).join("\n\n")
      : `Information for "${query}" generated from AI Knowledge Engine.`;

    res.json({ answer, chunks: results.chunks });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to execute semantic search" });
  }
});

export default router;
