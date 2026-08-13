import { prisma } from "@saas/database";

export class ApprovalWorkflowService {
  /**
   * List all defined approval workflows
   */
  static async getWorkflows(tenantId?: string) {
    return (prisma as any).approvalWorkflow.findMany({
      where: tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : {},
      include: {
        steps: { orderBy: { stepNumber: "asc" } },
        _count: { select: { requests: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Create new approval workflow with steps
   */
  static async createWorkflow(data: {
    name: string;
    triggerType: string;
    description?: string;
    tenantId?: string;
    steps: { stepNumber: number; title: string; requiredRole: string }[];
  }) {
    return (prisma as any).approvalWorkflow.create({
      data: {
        name: data.name,
        triggerType: data.triggerType,
        description: data.description,
        tenantId: data.tenantId || null,
        steps: {
          create: data.steps.map((s) => ({
            stepNumber: s.stepNumber,
            title: s.title,
            requiredRole: s.requiredRole,
          })),
        },
      },
      include: { steps: true },
    });
  }

  /**
   * Submit an approval request
   */
  static async submitRequest(data: {
    workflowId: string;
    requesterId: string;
    resourceType: string;
    resourceId: string;
    tenantId?: string;
    comments?: string;
  }) {
    return (prisma as any).approvalRequest.create({
      data: {
        workflowId: data.workflowId,
        requesterId: data.requesterId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        tenantId: data.tenantId || null,
        comments: data.comments,
        status: "PENDING",
        currentStep: 1,
      },
      include: {
        workflow: { include: { steps: true } },
      },
    });
  }

  /**
   * Process (approve or reject) an approval request
   */
  static async processRequest(requestId: string, action: "APPROVE" | "REJECT", comments?: string) {
    const request = await (prisma as any).approvalRequest.findUnique({
      where: { id: requestId },
      include: { workflow: { include: { steps: true } } },
    });

    if (!request) throw new Error("Approval request not found");
    if (request.status !== "PENDING") throw new Error("Request has already been processed");

    const totalSteps = request.workflow.steps.length;

    if (action === "REJECT") {
      return (prisma as any).approvalRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          comments: comments || request.comments,
        },
      });
    }

    // Approve logic
    if (request.currentStep >= totalSteps) {
      // Final step approved
      return (prisma as any).approvalRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          comments: comments || request.comments,
        },
      });
    }

    // Advance to next step
    return (prisma as any).approvalRequest.update({
      where: { id: requestId },
      data: {
        currentStep: request.currentStep + 1,
        comments: comments || request.comments,
      },
    });
  }
}
