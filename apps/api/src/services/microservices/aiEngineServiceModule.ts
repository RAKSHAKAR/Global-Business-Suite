import { prisma } from "@saas/database";
import { providerRouter } from "../ai/providerRouter";
import { agentExecutionEngine, AgentExecutionRequest } from "../ai/agentExecutionEngine";
import { ragVectorEngine, DocumentUploadInput } from "../ai/ragVectorEngine";
import { promptManager } from "../ai/promptManager";
import { aiGovernanceEngine } from "../ai/aiGovernanceEngine";
import { aiAnalyticsEngine } from "../ai/aiAnalyticsEngine";
import { aiWorkflowEngine } from "../ai/aiWorkflowEngine";
import { eventBus } from "../eventBus";

/**
 * Central AI Engine Service Module – Phase 12 Enterprise AI Platform
 * Acts as the primary entry point for all AI operations across GBS modules.
 * Delegates to specialized sub-engines: ProviderRouter, AgentExecutionEngine,
 * RagVectorEngine, PromptManager, GovernanceEngine, AnalyticsEngine, WorkflowEngine.
 */
export class AIEngineServiceModule {
  // ──────────────────────────────────────────────────────────────────────────
  // PROVIDER & MODEL MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Returns all active AI providers with their configured models.
   */
  public async getActiveProviders() {
    return prisma.aiProvider.findMany({
      where: { isActive: true },
      include: { models: { where: { isActive: true } } },
      orderBy: { priority: "asc" },
    });
  }

  /**
   * Returns all active AI models across all providers.
   */
  public async getActiveModels(providerKey?: string) {
    return prisma.aiModel.findMany({
      where: {
        isActive: true,
        ...(providerKey ? { provider: { providerKey } } : {}),
      },
      include: { provider: true },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEXT GENERATION (Core AI)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Primary text generation — routes through governance checks, provider router, and event bus.
   */
  public async generateText(params: {
    tenantId?: string;
    userId?: string;
    prompt: string;
    model?: string;
    providerKey?: string;
    systemInstruction?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    // Governance: PII masking & prompt safety
    const sanitizedPrompt = aiGovernanceEngine.maskSensitiveData(params.prompt);
    const safetyCheck = aiGovernanceEngine.auditPromptSafety(sanitizedPrompt);
    if (!safetyCheck.isSafe) {
      throw new Error(`[GOVERNANCE] Unsafe prompt blocked: ${safetyCheck.violationReason || "Policy violation"}`);
    }

    const completion = await providerRouter.generateCompletion({
      tenantId: params.tenantId,
      userId: params.userId,
      prompt: sanitizedPrompt,
      systemInstruction: params.systemInstruction,
      modelKey: params.model,
      providerKey: params.providerKey,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    // Emit usage event for billing and telemetry
    eventBus.publish(
      "ai:generated",
      {
        tenantId: params.tenantId,
        tokensUsed: completion.totalTokens,
        estimatedCost: completion.estimatedCost,
        providerKey: completion.providerKey,
        modelKey: completion.modelKey,
      },
      { tenantId: params.tenantId }
    );

    return {
      content: completion.content,
      tokensUsed: completion.totalTokens,
      modelUsed: completion.modelKey,
      providerUsed: completion.providerKey,
      estimatedCost: completion.estimatedCost,
      latencyMs: completion.latencyMs,
      isFailoverUsed: completion.isFailoverUsed,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI AGENT EXECUTION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Dispatches and executes an AI Agent request (Marketing, SEO, CRM, Support, etc.)
   */
  public async executeAgent(req: AgentExecutionRequest) {
    return agentExecutionEngine.executeAgent(req);
  }

  /**
   * Returns the full catalog of AI agents available to a tenant.
   */
  public async getAgentCatalog(tenantId?: string) {
    return prisma.aiAgent.findMany({
      where: {
        isActive: true,
        OR: [
          { tenantId: null },      // Global platform agents
          { tenantId: tenantId },  // Tenant-specific custom agents
        ],
      },
      orderBy: { agentType: "asc" },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RAG KNOWLEDGE BASE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Indexes a document into a knowledge base for RAG retrieval.
   */
  public async indexDocument(input: DocumentUploadInput) {
    return ragVectorEngine.processAndIndexDocument(input);
  }

  /**
   * Queries a knowledge base using semantic vector search.
   */
  public async queryKnowledge(params: {
    knowledgeBaseId?: string;
    tenantId?: string;
    query: string;
    topK?: number;
  }) {
    return ragVectorEngine.queryKnowledgeBase(params);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROMPT MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Renders a named prompt template with variable substitution.
   */
  public async renderPromptTemplate(promptKey: string, variables: Record<string, string>) {
    return promptManager.renderPrompt({ promptKey, variables });
  }

  /**
   * Directly interpolates variable placeholders in a template string.
   */
  public interpolateVariables(template: string, variables: Record<string, string>) {
    return promptManager.interpolateVariables(template, variables);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI WORKFLOWS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Triggers an AI workflow by ID.
   */
  public async triggerWorkflow(workflowId: string, inputData?: Record<string, any>) {
    return aiWorkflowEngine.triggerWorkflow(workflowId, inputData);
  }

  /**
   * Publishes a domain event to the workflow engine (e.g. REVIEW_CREATED).
   */
  public async publishDomainEvent(eventName: string, payload: Record<string, any>) {
    return aiWorkflowEngine.handleDomainEvent(eventName, payload);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI ANALYTICS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Returns aggregated AI usage analytics (tokens, costs, latency, provider breakdown).
   */
  public async getAnalytics(tenantId?: string) {
    return aiAnalyticsEngine.getAnalyticsSummary(tenantId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI GOVERNANCE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Masks PII sensitive data (SSN, credit card, phone, email) in a text string.
   */
  public maskSensitiveData(text: string) {
    return aiGovernanceEngine.maskSensitiveData(text);
  }

  /**
   * Audits a prompt for safety against forbidden terms and malicious patterns.
   */
  public auditPromptSafety(prompt: string) {
    return aiGovernanceEngine.auditPromptSafety(prompt);
  }
}

export const aiEngineServiceModule = new AIEngineServiceModule();
