import { prisma } from "@saas/database";
import { agentExecutionEngine } from "./agentExecutionEngine";
import { eventBus } from "../eventBus";

export class AiWorkflowEngine {
  /**
   * Initializes event listeners for event-driven AI workflows.
   */
  public registerEventListeners(): void {
    // 1. Event: Customer Review Created -> Auto-Generate Review Reply
    eventBus.subscribe("review:created", async (payload: any) => {
      try {
        if (!payload.reviewId) return;
        const review = await prisma.review.findUnique({
          where: { id: payload.reviewId },
          include: { location: true },
        });

        if (!review) return;

        const result = await agentExecutionEngine.executeAgent({
          agentKey: "REVIEW_AGENT",
          tenantId: review.tenantId || review.location.tenantId,
          userPrompt: `Generate a tone-appropriate reply for a ${review.starRating}-star customer review:\nReviewer: ${review.reviewerName || "Customer"}\nComment: "${review.comment || "Great experience!"}"`,
        });

        await prisma.review.update({
          where: { id: review.id },
          data: {
            aiSuggestedReply: result.content,
            replyStatus: "PENDING_APPROVAL",
          },
        });
      } catch (err) {
        console.error("AI Workflow Failed for review:created", err);
      }
    });

    // 2. Event: CRM Lead Captured -> Auto-Generate Sales Outreach & Lead Score
    eventBus.subscribe("lead:captured", async (payload: any) => {
      try {
        if (!payload.opportunityId) return;
        const opp = await prisma.crmOpportunity.findUnique({
          where: { id: payload.opportunityId },
        });

        if (!opp) return;

        const result = await agentExecutionEngine.executeAgent({
          agentKey: "CRM_AGENT",
          tenantId: payload.tenantId,
          userPrompt: `Analyze new sales opportunity for company "${opp.companyName || opp.title}", contact "${opp.contactName || "Lead"}" with deal value $${opp.value}. Suggest initial response email and lead score rationale.`,
        });

        await prisma.crmActivity.create({
          data: {
            opportunityId: opp.id,
            type: "NOTE",
            subject: "AI Lead Intelligence Analysis",
            details: result.content,
            performedBy: "AI Agent",
          },
        });
      } catch (err) {
        console.error("AI Workflow Failed for lead:captured", err);
      }
    });
  }

  /**
   * Triggers a workflow by ID manually or programmatically.
   */
  public async triggerWorkflow(workflowId: string, inputData?: Record<string, any>): Promise<{ success: boolean; result: string }> {
    return this.executeWorkflow(workflowId, inputData?.tenantId);
  }

  /**
   * Handles a domain event and routes to any matching active event-driven workflows.
   */
  public async handleDomainEvent(eventName: string, payload: Record<string, any>): Promise<void> {
    const workflows = await prisma.aiWorkflow.findMany({
      where: {
        isActive: true,
        triggerType: "EVENT",
      },
    });

    for (const workflow of workflows) {
      let triggerConfig: any = {};
      try {
        triggerConfig = JSON.parse(workflow.triggerConfigJson || "{}");
      } catch (e) {
        triggerConfig = {};
      }

      if (triggerConfig.eventName === eventName) {
        try {
          await this.executeWorkflow(workflow.id, workflow.tenantId || undefined);
        } catch (err) {
          console.error(`AI Workflow [${workflow.name}] failed for domain event [${eventName}]:`, err);
        }
      }
    }
  }

  /**
   * Executes a workflow pipeline by stepping through agent tasks.
   */
  public async executeWorkflow(workflowId: string, tenantId?: string): Promise<{ success: boolean; result: string }> {
    const workflow = await prisma.aiWorkflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new Error("AI Workflow not found");

    // Create run record
    const run = await prisma.aiWorkflowRun.create({
      data: {
        workflowId: workflow.id,
        tenantId: tenantId || workflow.tenantId,
        triggeredBy: "SYSTEM",
        status: "RUNNING",
      },
    });

    let steps: any[] = [];
    try {
      steps = JSON.parse(workflow.stepsJson || "[]");
    } catch (e) {
      steps = [];
    }

    let lastResult = `Workflow [${workflow.name}] initiated.`;
    let runStatus = "SUCCESS";
    let errorMessage: string | undefined;

    try {
      for (const step of steps) {
        if (step.type === "EXECUTE_AGENT") {
          const res = await agentExecutionEngine.executeAgent({
            agentKey: step.agentKey || "MARKETING_AGENT",
            tenantId: tenantId || workflow.tenantId || undefined,
            userPrompt: step.prompt || lastResult,
          });
          lastResult = res.content;
        }
      }
    } catch (err: any) {
      runStatus = "FAILED";
      errorMessage = err?.message;
      lastResult = `Workflow failed: ${errorMessage}`;
    }

    // Update workflow run record
    const endTime = Date.now();
    await prisma.aiWorkflowRun.update({
      where: { id: run.id },
      data: {
        status: runStatus,
        outputJson: JSON.stringify({ result: lastResult }),
        errorMessage,
        completedAt: new Date(),
        durationMs: endTime - run.createdAt.getTime(),
      },
    });

    // Update workflow metadata
    await prisma.aiWorkflow.update({
      where: { id: workflow.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: runStatus,
        runCount: { increment: 1 },
      },
    });

    return { success: runStatus === "SUCCESS", result: lastResult };
  }
}

export const aiWorkflowEngine = new AiWorkflowEngine();
// Register listeners on module load
aiWorkflowEngine.registerEventListeners();
