import { Router, Response, Request } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { platformServicesEngineService } from "../../services/platformServicesEngineService";
import { sendSuccess, sendError } from "../../utils/responseHandler";

export const platformServicesEngineRouter = Router();

/**
 * @openapi
 * /platform-services/notifications/send:
 *   post:
 *     summary: Centralized multi-channel notification dispatch
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.post("/notifications/send", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { recipient, channel, title, body, variables, templateKey, scheduledAt, fallbackChannel, metadata } = req.body;

    if (!recipient || !title || !body) {
      return sendError(res, "Recipient, title, and body are required", 400);
    }

    const result = await platformServicesEngineService.sendMultiChannelNotification({
      tenantId: req.user?.tenantId ?? undefined,
      userId: req.user?.id ?? undefined,
      recipient,
      channel: channel || "EMAIL",
      title,
      body,
      variables,
      templateKey,
      scheduledAt,
      fallbackChannel,
      metadata,
    });

    return sendSuccess(res, result, 201);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to dispatch notification", 500);
  }
});

platformServicesEngineRouter.patch("/notifications/:id/read", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await platformServicesEngineService.markNotificationRead(req.params.id, req.user?.id ?? undefined);
    return sendSuccess(res, updated);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to mark notification read", 500);
  }
});

platformServicesEngineRouter.get("/notifications/logs", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const logs = await platformServicesEngineService.getNotificationLogs(req.user?.tenantId ?? undefined, req.query.channel as string);
    return sendSuccess(res, { logs });
  } catch (error: any) {
    return sendError(res, error.message || "Failed to fetch notification logs", 500);
  }
});

/**
 * @openapi
 * /platform-services/workflows/definitions:
 *   post:
 *     summary: Create or update visual workflow definition
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.post("/workflows/definitions", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { key, name, description, triggerType, nodes, edges } = req.body;
    if (!key || !name) {
      return sendError(res, "Workflow key and name are required", 400);
    }

    const workflow = await platformServicesEngineService.saveVisualWorkflow({
      tenantId: req.user?.tenantId ?? undefined,
      key,
      name,
      description,
      triggerType: triggerType || "EVENT",
      nodes: nodes || [],
      edges: edges || [],
    });

    return sendSuccess(res, { workflow }, 201);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to save workflow definition", 500);
  }
});

platformServicesEngineRouter.post("/workflows/execute", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { workflowKey, inputParams } = req.body;
    if (!workflowKey) {
      return sendError(res, "Workflow key is required", 400);
    }

    const execution = await platformServicesEngineService.executeWorkflow(
      workflowKey,
      inputParams || {},
      req.user?.tenantId ?? undefined,
      req.user?.id ?? undefined,
    );

    return sendSuccess(res, { execution });
  } catch (error: any) {
    return sendError(res, error.message || "Workflow execution failed", 500);
  }
});

platformServicesEngineRouter.get("/workflows/executions", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const executions = await platformServicesEngineService.getWorkflowExecutions(
      req.query.workflowKey as string,
      req.user?.tenantId ?? undefined,
    );
    return sendSuccess(res, { executions });
  } catch (error: any) {
    return sendError(res, error.message || "Failed to fetch workflow executions", 500);
  }
});

/**
 * @openapi
 * /platform-services/automation/jobs:
 *   post:
 *     summary: Enqueue background automation job
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.post("/automation/jobs", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { queueName, jobType, payload, priority, maxRetries, scheduledAt } = req.body;
    if (!jobType || !payload) {
      return sendError(res, "Job type and payload are required", 400);
    }

    const job = await platformServicesEngineService.enqueueJob({
      tenantId: req.user?.tenantId ?? undefined,
      queueName,
      jobType,
      payload,
      priority,
      maxRetries,
      scheduledAt,
    });

    return sendSuccess(res, { job }, 201);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to enqueue automation job", 500);
  }
});

platformServicesEngineRouter.post("/automation/jobs/process", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await platformServicesEngineService.processQueueJobs((req.body.queueName as string) || "DEFAULT");
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to process queue jobs", 500);
  }
});

platformServicesEngineRouter.post("/automation/jobs/retry-dlq", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await platformServicesEngineService.retryDeadLetterQueue(req.user?.tenantId ?? undefined);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to retry DLQ jobs", 500);
  }
});

/**
 * @openapi
 * /platform-services/integrations/connectors:
 *   get:
 *     summary: List registered integration connectors
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.get("/integrations/connectors", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connectors = await platformServicesEngineService.getConnectors(req.user?.tenantId ?? undefined);
    return sendSuccess(res, { connectors });
  } catch (error: any) {
    return sendError(res, error.message || "Failed to fetch connectors", 500);
  }
});

platformServicesEngineRouter.post("/integrations/connectors", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { connectorKey, name, connectorType, credentials, settings } = req.body;
    if (!connectorKey || !name) {
      return sendError(res, "Connector key and name are required", 400);
    }

    const connector = await platformServicesEngineService.registerConnector({
      tenantId: req.user?.tenantId ?? undefined,
      connectorKey,
      name,
      connectorType,
      credentials,
      settings,
    });

    return sendSuccess(res, { connector }, 201);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to register connector", 500);
  }
});

/**
 * @openapi
 * /platform-services/feature-flags/evaluate-hierarchical:
 *   post:
 *     summary: Evaluate feature flag across tenant/user hierarchy
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.post("/feature-flags/evaluate-hierarchical", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { flagKey } = req.body;
    if (!flagKey) return sendError(res, "flagKey is required", 400);

    const evaluation = await platformServicesEngineService.evaluateHierarchicalFlag(flagKey, {
      tenantId: req.user?.tenantId ?? undefined,
      userId: req.user?.id ?? undefined,
      role: (req.user as any)?.role,
    });

    return sendSuccess(res, evaluation);
  } catch (error: any) {
    return sendError(res, error.message || "Feature flag evaluation failed", 500);
  }
});

platformServicesEngineRouter.post(
  "/feature-flags/kill-switch",
  authMiddleware,
  requirePermission("settings", "manage"),
  async (req: Request, res: Response) => {
    try {
      const { flagKey } = req.body;
      if (!flagKey) return sendError(res, "flagKey is required", 400);

      const flag = await platformServicesEngineService.triggerEmergencyKillSwitch(flagKey);
      return sendSuccess(res, { flag, killSwitchActivated: true });
    } catch (error: any) {
      return sendError(res, error.message || "Emergency kill switch failed", 500);
    }
  },
);

/**
 * @openapi
 * /platform-services/monitoring/system-health:
 *   get:
 *     summary: Centralized system monitoring & observability telemetry
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.get("/monitoring/system-health", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const telemetry = await platformServicesEngineService.getSystemHealthTelemetry();
    return sendSuccess(res, telemetry);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to fetch health telemetry", 500);
  }
});

/**
 * @openapi
 * /platform-services/security-ops/threats:
 *   get:
 *     summary: Security Operations Threat Logs
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.get("/security-ops/threats", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const threats = await platformServicesEngineService.getSecurityThreats(req.user?.tenantId ?? undefined);
    return sendSuccess(res, { threats });
  } catch (error: any) {
    return sendError(res, error.message || "Failed to fetch security threats", 500);
  }
});

platformServicesEngineRouter.post("/security-ops/log-threat", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { ipAddress, threatType, geoCountry, severity, wasBlocked, details } = req.body;
    if (!ipAddress || !threatType) {
      return sendError(res, "ipAddress and threatType are required", 400);
    }

    const threat = await platformServicesEngineService.logSecurityThreat({
      tenantId: req.user?.tenantId ?? undefined,
      userId: req.user?.id ?? undefined,
      ipAddress,
      geoCountry,
      threatType,
      severity,
      wasBlocked,
      details,
    });

    return sendSuccess(res, { threat }, 201);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to log threat", 500);
  }
});

/**
 * @openapi
 * /platform-services/backup-dr/trigger:
 *   post:
 *     summary: Trigger automated system backup
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.post("/backup-dr/trigger", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const backup = await platformServicesEngineService.triggerAutomatedBackup(req.body.backupType || "FULL", req.user?.tenantId ?? undefined);
    return sendSuccess(res, { backup }, 201);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to trigger backup", 500);
  }
});

platformServicesEngineRouter.post("/backup-dr/restore-test", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { backupId } = req.body;
    if (!backupId) return sendError(res, "backupId is required", 400);

    const result = await platformServicesEngineService.simulateRestoreTest(backupId);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error.message || "Failed to simulate restore test", 500);
  }
});

/**
 * @openapi
 * /platform-services/compliance/gdpr/erasure:
 *   post:
 *     summary: Execute GDPR / CCPA Right to Erasure
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.post(
  "/compliance/gdpr/erasure",
  authMiddleware,
  requirePermission("users", "delete"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) return sendError(res, "targetUserId is required", 400);

      const result = await platformServicesEngineService.executeRightToErasure(
        targetUserId,
        req.user?.id || "SYSTEM_ADMIN",
        req.user?.tenantId ?? undefined,
      );

      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, error.message || "GDPR erasure execution failed", 500);
    }
  },
);

/**
 * @openapi
 * /platform-services/search/global-v2:
 *   get:
 *     summary: Search Platform Global Full-Text & Entity Query
 *     tags: [Platform Services]
 */
platformServicesEngineRouter.get("/search/global-v2", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) return sendError(res, "Query parameter 'q' is required", 400);

    const results = await platformServicesEngineService.executeGlobalSearchV2(q, req.user?.tenantId ?? undefined, req.user?.id ?? undefined);
    return sendSuccess(res, results);
  } catch (error: any) {
    return sendError(res, error.message || "Search execution failed", 500);
  }
});
