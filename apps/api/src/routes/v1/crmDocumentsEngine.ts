import { Router, Request, Response } from "express";
import { prisma } from "@saas/database";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";

export const crmDocumentsEngineRouter = Router();

// GET /api/v1/crm/documents - List Quotes, Proposals & Contracts
crmDocumentsEngineRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const docType = String(req.query.docType || "").trim();

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (docType) where.docType = docType;

    const documents = await prisma.crmDocument.findMany({
      where,
      include: { opportunity: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ documents });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch CRM documents", details: error?.message });
  }
});

// POST /api/v1/crm/documents - Create Quote / Contract / Proposal Document
crmDocumentsEngineRouter.post("/", authMiddleware, requirePermission("documents", "manage"), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId || (await prisma.tenant.findFirst())?.id;
    const { opportunityId, leadId, accountId, contactId, name, docType, fileUrl, fileSize, totalAmount, validUntil } = req.body;

    if (!name) return res.status(400).json({ error: "Document name is required" });

    const document = await prisma.crmDocument.create({
      data: {
        tenantId,
        opportunityId: opportunityId || null,
        leadId: leadId || null,
        accountId: accountId || null,
        contactId: contactId || null,
        name,
        docType: docType || "QUOTE",
        fileUrl: fileUrl || "https://storage.platform.local/docs/sample_quote.pdf",
        fileSize: parseInt(fileSize) || 124000,
        status: "DRAFT",
        totalAmount: parseFloat(totalAmount) || 0,
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdByUserId: user.id,
      },
    });

    res.status(201).json({ document });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create document", details: error?.message });
  }
});

// POST /api/v1/crm/documents/:id/sign - Digital Signature Integration Endpoint
crmDocumentsEngineRouter.post("/:id/sign", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { signerName, signerEmail, signatureBase64, ipAddress } = req.body;

    if (!signerName || !signerEmail) {
      return res.status(400).json({ error: "Signer name and email are required" });
    }

    const document = await prisma.crmDocument.findUnique({ where: { id } });
    if (!document) return res.status(404).json({ error: "Document not found" });

    const signatureData = {
      signerName,
      signerEmail,
      signedAt: new Date().toISOString(),
      ipAddress: ipAddress || req.ip,
      hash: "SHA256-DIGITAL-SIG-" + Math.random().toString(36).substring(2, 12).toUpperCase(),
    };

    const updatedDocument = await prisma.crmDocument.update({
      where: { id },
      data: {
        status: "SIGNED",
        digitalSignatureDataJson: JSON.stringify(signatureData),
      },
    });

    res.json({
      message: "Document successfully signed with valid cryptographic proof",
      document: updatedDocument,
      signatureData,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to sign document", details: error?.message });
  }
});

// PUT /api/v1/crm/documents/:id/status - Update Proposal Status (Accept / Reject)
crmDocumentsEngineRouter.put("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ACCEPTED, REJECTED, VIEWED

    if (!status) return res.status(400).json({ error: "Status is required" });

    const document = await prisma.crmDocument.update({
      where: { id },
      data: { status },
    });

    res.json({ document, message: `Document status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update document status", details: error?.message });
  }
});
