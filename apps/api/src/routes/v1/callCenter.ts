import { Router, Request, Response } from "express";
import { CallCenterService } from "../../services/callCenterService";

export const callCenterRouter = Router();

// GET /api/v1/calls
callCenterRouter.get("/", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const callType = req.query.callType as string;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const calls = await CallCenterService.listCalls(tenantId, { callType, status, search });
    res.json({ success: true, count: calls.length, data: calls });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/calls/log
callCenterRouter.post("/log", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const call = await CallCenterService.logCall({ ...req.body, tenantId });
    res.status(201).json({ success: true, data: call });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/calls/:id/analyze
callCenterRouter.post("/:id/analyze", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const result = await CallCenterService.analyzeCallAi(req.params.id, tenantId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/calls/callback
callCenterRouter.post("/callback", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const callback = await CallCenterService.scheduleCallback({
      ...req.body,
      tenantId,
      scheduledTime: new Date(req.body.scheduledTime),
    });
    res.status(201).json({ success: true, data: callback });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/calls/callback
callCenterRouter.get("/callback", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const callbacks = await CallCenterService.listCallbacks(tenantId);
    res.json({ success: true, data: callbacks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/calls/analytics
callCenterRouter.get("/analytics", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const analytics = await CallCenterService.getCallAnalytics(tenantId);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/calls/queue-config
callCenterRouter.post("/queue-config", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const { queueName, routingType, agentUserIdsJson, maxWaitTimeSec } = req.body;
    const config = await CallCenterService.configureQueue(tenantId, queueName, routingType, agentUserIdsJson, maxWaitTimeSec);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/calls/ivr-config
callCenterRouter.post("/ivr-config", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const { name, menuNodesJson, greetingAudioUrl } = req.body;
    const config = await CallCenterService.configureIvr(tenantId, name, menuNodesJson, greetingAudioUrl);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
