import { Router, Request, Response } from "express";
import { WhiteLabelService } from "../../services/whiteLabelService";

export const whiteLabelRouter = Router();

// GET /api/v1/whitelabel
whiteLabelRouter.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const config = await WhiteLabelService.getWhiteLabelConfig(tenantId);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/whitelabel
whiteLabelRouter.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const config = await WhiteLabelService.updateWhiteLabelConfig({ ...req.body, tenantId });
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/whitelabel/resolve-domain
whiteLabelRouter.get("/resolve-domain", async (req: Request, res: Response) => {
  try {
    const domain = (req.query.domain as string) || "localhost";
    const config = await WhiteLabelService.resolveByDomain(domain);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/whitelabel/render-template
whiteLabelRouter.post("/render-template", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const { templateType, data } = req.body;
    const rendered = await WhiteLabelService.renderBrandedTemplate(tenantId, templateType || "EMAIL", data || {});
    res.json({ success: true, data: rendered });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
