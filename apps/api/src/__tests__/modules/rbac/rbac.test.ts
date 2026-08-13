import { FeatureFlagService } from "../../../services/featureFlagService";
import { ApprovalWorkflowService } from "../../../services/approvalWorkflowService";
import { requirePermission } from "../../../middleware/rbac";

describe("Phase 3 RBAC & Access Control Module Test Suite", () => {
  it("evaluates dynamic feature flags for subscription plans", async () => {
    await FeatureFlagService.upsertFlag({
      key: "AI_STUDIO_TEST",
      name: "AI Studio Test Flag",
      isEnabled: true,
      targetRules: { plans: ["PRO", "ENTERPRISE"] },
    });

    const isEnabledPro = await FeatureFlagService.isEnabled("AI_STUDIO_TEST", { planId: "PRO" });
    expect(isEnabledPro).toBe(true);

    const isEnabledFree = await FeatureFlagService.isEnabled("AI_STUDIO_TEST", { planId: "FREE" });
    expect(isEnabledFree).toBe(false);
  });

  it("advances multi-step approval workflow state machine", async () => {
    const workflow = await ApprovalWorkflowService.createWorkflow({
      name: "Test Content Approval",
      triggerType: "POST_PUBLISH",
      description: "Multi-step content review",
      steps: [
        { stepNumber: 1, title: "Manager Review", requiredRole: "MANAGER" },
        { stepNumber: 2, title: "Super Admin Final Signoff", requiredRole: "SUPER_ADMIN" },
      ],
    });

    expect(workflow.steps.length).toBe(2);

    const req = await ApprovalWorkflowService.submitRequest({
      workflowId: workflow.id,
      requesterId: "test-user-id",
      resourceType: "SocialPost",
      resourceId: "post-123",
    });

    expect(req.status).toBe("PENDING");
    expect(req.currentStep).toBe(1);

    const step1Approved = await ApprovalWorkflowService.processRequest(req.id, "APPROVE");
    expect(step1Approved.currentStep).toBe(2);

    const finalApproved = await ApprovalWorkflowService.processRequest(req.id, "APPROVE");
    expect(finalApproved.status).toBe("APPROVED");
  });

  it("validates permission guard middleware factory", () => {
    const middleware = requirePermission("users", "create", "TENANT");
    expect(typeof middleware).toBe("function");
  });
});
