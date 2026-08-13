import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth";
import { requirePermission } from "../../middleware/rbac";
import { ApprovalWorkflowService } from "../../services/approvalWorkflowService";
import { auditLog } from "../../services/auditLogger";

export const approvalWorkflowsRouter = Router();

// GET /api/v1/approval-workflows - List approval workflows
approvalWorkflowsRouter.get(
  "/",
  authMiddleware,
  requirePermission("roles", "read"),
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).user.tenantId;
      const workflows = await ApprovalWorkflowService.getWorkflows(tenantId);
      res.json({ workflows });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approval workflows" });
    }
  },
);

// POST /api/v1/approval-workflows - Create approval workflow
approvalWorkflowsRouter.post(
  "/",
  authMiddleware,
  requirePermission("roles", "create"),
  async (req: Request, res: Response) => {
    try {
      const { name, triggerType, description, steps } = req.body;
      const user = (req as any).user;

      if (!name || !triggerType || !steps || !Array.isArray(steps)) {
        return res.status(400).json({ error: "Name, triggerType, and steps array are required" });
      }

      const workflow = await ApprovalWorkflowService.createWorkflow({
        name,
        triggerType,
        description,
        tenantId: user.tenantId,
        steps,
      });

      await auditLog(user.id || user.userId, user.tenantId, "APPROVAL_WORKFLOW_CREATED", "ApprovalWorkflow", workflow.id, { name }, req);

      res.status(201).json({ workflow });
    } catch (error) {
      res.status(500).json({ error: "Failed to create approval workflow" });
    }
  },
);

// POST /api/v1/approval-workflows/requests - Submit approval request
approvalWorkflowsRouter.post(
  "/requests",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { workflowId, resourceType, resourceId, comments } = req.body;
      const user = (req as any).user;

      if (!workflowId || !resourceType || !resourceId) {
        return res.status(400).json({ error: "workflowId, resourceType, and resourceId are required" });
      }

      const request = await ApprovalWorkflowService.submitRequest({
        workflowId,
        requesterId: user.id || user.userId,
        resourceType,
        resourceId,
        tenantId: user.tenantId,
        comments,
      });

      res.status(201).json({ request });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit approval request" });
    }
  },
);

// POST /api/v1/approval-workflows/requests/:id/process - Approve or Reject request
approvalWorkflowsRouter.post(
  "/requests/:id/process",
  authMiddleware,
  requirePermission("roles", "approve"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, comments } = req.body; // action: "APPROVE" | "REJECT"
      const user = (req as any).user;

      if (!["APPROVE", "REJECT"].includes(action)) {
        return res.status(400).json({ error: "Action must be APPROVE or REJECT" });
      }

      const updated = await ApprovalWorkflowService.processRequest(id, action, comments);

      await auditLog(user.id || user.userId, user.tenantId, `APPROVAL_${action}D`, "ApprovalRequest", id, { action }, req);

      res.json({ message: `Request ${action.toLowerCase()}d successfully`, request: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to process approval request" });
    }
  },
);
