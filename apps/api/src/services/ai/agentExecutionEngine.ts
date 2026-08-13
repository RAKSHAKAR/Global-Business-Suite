import { prisma } from "@saas/database";
import { providerRouter, AICompletionResponse } from "./providerRouter";
import { ragVectorEngine } from "./ragVectorEngine";
import { aiGovernanceEngine } from "./aiGovernanceEngine";

export interface AgentExecutionRequest {
  agentKey: string;
  tenantId?: string;
  userId?: string;
  userPrompt: string;
  contextData?: Record<string, any>;
  knowledgeBaseId?: string;
  useRag?: boolean;
}

export class AgentExecutionEngine {
  /**
   * Dispatches and executes an AI Agent request using domain system prompts, attached RAG knowledge, and safety governance.
   */
  public async executeAgent(req: AgentExecutionRequest): Promise<AICompletionResponse & { agentName: string; citations?: string[] }> {
    // 1. Fetch Agent definition from DB or default catalog
    const agentFromDb = await prisma.aiAgent.findFirst({
      where: { key: req.agentKey },
    });

    // Guaranteed non-null: fallback to built-in catalog if DB not seeded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agent: any = agentFromDb ?? this.getDefaultAgentDefinition(req.agentKey);

    // 2. Perform Governance Checks & PII Sanitization
    const sanitizedPrompt = aiGovernanceEngine.maskSensitiveData(req.userPrompt);
    await aiGovernanceEngine.validateRateLimits(req.tenantId, req.userId);

    // 3. RAG Retrieval if enabled or knowledge base attached
    let ragContext = "";
    let citations: string[] = [];

    if (req.useRag || req.knowledgeBaseId || agent.knowledgeBaseIdsJson !== "[]") {
      const kbId = req.knowledgeBaseId || JSON.parse(agent.knowledgeBaseIdsJson || "[]")[0];
      if (kbId) {
        const ragResult = await ragVectorEngine.queryKnowledgeBase({
          knowledgeBaseId: kbId,
          tenantId: req.tenantId,
          query: sanitizedPrompt,
          topK: 3,
        });

        if (ragResult.chunks.length > 0) {
          ragContext = `\n\n[RELEVANT KNOWLEDGE BASE CONTEXT]:\n` + ragResult.chunks.map((c, idx) => `[Source ${idx + 1}: ${c.documentTitle}]: ${c.content}`).join("\n\n");
          citations = ragResult.chunks.map((c) => c.documentTitle);
        }
      }
    }

    // 4. Construct System Instruction
    let systemInstruction = agent.systemPrompt;
    if (req.contextData) {
      systemInstruction += `\n\n[CURRENT CONTEXT DATA]:\n${JSON.stringify(req.contextData, null, 2)}`;
    }
    if (ragContext) {
      systemInstruction += ragContext;
    }

    // 5. Invoke Provider Router
    const completion = await providerRouter.generateCompletion({
      tenantId: req.tenantId,
      userId: req.userId,
      agentId: agent.id,
      prompt: sanitizedPrompt,
      systemInstruction,
      modelKey: agent.defaultModelKey,
      providerKey: agent.providerKey,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    });

    return {
      ...completion,
      agentName: agent.name,
      citations,
    };
  }

  /**
   * Returns default definitions for the 16 GBS enterprise AI Agents.
   */
  private getDefaultAgentDefinition(key: string): any {
    const defaultAgents: Record<string, any> = {
      MARKETING_AGENT: {
        id: "agent-marketing",
        key: "MARKETING_AGENT",
        name: "Marketing Agent",
        type: "MARKETING",
        systemPrompt: "You are the GBS Enterprise Marketing Agent. Your goal is to write captivating, multi-platform promotional campaigns, blog headlines, call-to-actions, and brand posts.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.8,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      SEO_AGENT: {
        id: "agent-seo",
        key: "SEO_AGENT",
        name: "SEO Optimization Agent",
        type: "SEO",
        systemPrompt: "You are the GBS Local & Global SEO Agent. Optimize titles, descriptions, keyword positioning, schema markup, and Google Business Profile local ranking factors.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.4,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      CRM_AGENT: {
        id: "agent-crm",
        key: "CRM_AGENT",
        name: "CRM & Lead Intelligence Agent",
        type: "CRM",
        systemPrompt: "You are the GBS CRM & Sales Intelligence Agent. Analyze lead behavior, calculate lead conversion probability, draft personalized follow-ups, and summarize deal activities.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.5,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      SALES_AGENT: {
        id: "agent-sales",
        key: "SALES_AGENT",
        name: "Sales Assistant Agent",
        type: "SALES",
        systemPrompt: "You are the GBS Sales Strategy Agent. Assist sales reps in objection handling, competitive positioning, customer quotation notes, and closing proposals.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.6,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      SUPPORT_AGENT: {
        id: "agent-support",
        key: "SUPPORT_AGENT",
        name: "Customer Support & FAQ Agent",
        type: "SUPPORT",
        systemPrompt: "You are the GBS Customer Support Agent. Provide polite, accurate, concise assistance to user questions based on internal policies and knowledge bases.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.3,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      GBP_AGENT: {
        id: "agent-gbp",
        key: "GBP_AGENT",
        name: "Google Business Profile Agent",
        type: "GBP",
        systemPrompt: "You are the GBS Google Business Profile Specialist. Craft GBP location posts, offer announcements, brand-compliant review replies, and Q&A answers.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.7,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      SOCIAL_AGENT: {
        id: "agent-social",
        key: "SOCIAL_AGENT",
        name: "Social Media Campaign Agent",
        type: "SOCIAL",
        systemPrompt: "You are the GBS Cross-Platform Social Media Manager. Generate content tailored for Facebook, Instagram, LinkedIn, X (Twitter), TikTok, YouTube, and Threads.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.8,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      ANALYTICS_AGENT: {
        id: "agent-analytics",
        key: "ANALYTICS_AGENT",
        name: "Business Intelligence & Analytics Agent",
        type: "ANALYTICS",
        systemPrompt: "You are the GBS Analytics & Business Intelligence Specialist. Interpret multi-tenant performance metrics, traffic growth, impression trends, and revenue insights.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.3,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      BILLING_AGENT: {
        id: "agent-billing",
        key: "BILLING_AGENT",
        name: "Billing & Revenue Agent",
        type: "BILLING",
        systemPrompt: "You are the GBS Billing & Finance Assistant. Explain invoice line items, subscription plan entitlements, token usage quotas, and payment processing details.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.2,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      REVIEW_AGENT: {
        id: "agent-review",
        key: "REVIEW_AGENT",
        name: "Review Management Agent",
        type: "REVIEW",
        systemPrompt: "You are the GBS Review Reputation Agent. Analyze sentiment of customer reviews, craft empathetic responses, and flag urgent negative feedback.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.5,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      KNOWLEDGE_AGENT: {
        id: "agent-knowledge",
        key: "KNOWLEDGE_AGENT",
        name: "Enterprise Knowledge Base Agent",
        type: "KNOWLEDGE",
        systemPrompt: "You are the GBS Knowledge Synthesis Agent. Search uploaded documents, extract key facts, cite sources, and answer complex operational queries.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.3,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      WORKFLOW_AGENT: {
        id: "agent-workflow",
        key: "WORKFLOW_AGENT",
        name: "Automation Workflow Agent",
        type: "WORKFLOW",
        systemPrompt: "You are the GBS Automation Workflow Specialist. Orchestrate multi-step AI triggers, scheduled publishing pipelines, and automated notification dispatches.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.4,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      ADMIN_ASSISTANT: {
        id: "agent-admin-assistant",
        key: "ADMIN_ASSISTANT",
        name: "Super Admin Co-Pilot",
        type: "ADMIN_ASSISTANT",
        systemPrompt: "You are the GBS Executive Super Admin Co-Pilot. Assist platform administrators in managing tenants, configuring roles, monitoring security, and auditing usage.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.4,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      PARTNER_ASSISTANT: {
        id: "agent-partner-assistant",
        key: "PARTNER_ASSISTANT",
        name: "Partner Growth Assistant",
        type: "PARTNER_ASSISTANT",
        systemPrompt: "You are the GBS Partner Growth Assistant. Help business partners scale operations, post high-performing content, analyze local reach, and close leads.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.6,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      CUSTOMER_ASSISTANT: {
        id: "agent-customer-assistant",
        key: "CUSTOMER_ASSISTANT",
        name: "Customer Self-Service Assistant",
        type: "CUSTOMER_ASSISTANT",
        systemPrompt: "You are the GBS Customer Concierge Assistant. Help end customers check order status, view appointments, ask questions, and explore available services.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.5,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
      DEVELOPER_ASSISTANT: {
        id: "agent-developer-assistant",
        key: "DEVELOPER_ASSISTANT",
        name: "Developer & Integration Assistant",
        type: "DEVELOPER_ASSISTANT",
        systemPrompt: "You are the GBS Developer Co-Pilot. Assist software engineers with REST API contracts, webhook payloads, SDK integration samples, and system troubleshooting.",
        defaultModelKey: "gemini-1.5-pro",
        providerKey: "gemini",
        temperature: 0.3,
        maxTokens: 2048,
        knowledgeBaseIdsJson: "[]",
      },
    };

    return defaultAgents[key] || defaultAgents["MARKETING_AGENT"];
  }
}

export const agentExecutionEngine = new AgentExecutionEngine();
