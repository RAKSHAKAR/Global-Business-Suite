import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../index";
import { providerRouter } from "../services/ai/providerRouter";
import { agentExecutionEngine } from "../services/ai/agentExecutionEngine";
import { ragVectorEngine } from "../services/ai/ragVectorEngine";
import { promptManager } from "../services/ai/promptManager";
import { aiGovernanceEngine } from "../services/ai/aiGovernanceEngine";
import { aiAnalyticsEngine } from "../services/ai/aiAnalyticsEngine";
import { aiWorkflowEngine } from "../services/ai/aiWorkflowEngine";

describe("PHASE 12 – ENTERPRISE AI PLATFORM, AI AGENTS & AUTOMATION TEST SUITE", () => {
  let mockToken: string;

  beforeAll(async () => {
    const secret = process.env.JWT_SECRET || "dev-only-secret-replace-in-production-immediately";
    mockToken = jwt.sign(
      { id: "test-admin-id", email: "admin@gbs.com", role: "ADMIN", tenantId: "test-tenant-id" },
      secret
    );
    // Suppress console output during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  // 1. Provider Router Engine Tests
  describe("Provider Router & Multi-Provider Failover", () => {
    it("should generate AI completion using default Gemini provider", async () => {
      const res = await providerRouter.generateCompletion({
        prompt: "Write a short headline for local dental clinic",
        providerKey: "gemini",
        modelKey: "gemini-1.5-pro",
      });

      expect(res).toBeDefined();
      expect(res.content).toContain("AI Generated Output");
      expect(res.providerKey).toBe("gemini");
      expect(res.totalTokens).toBeGreaterThan(0);
      expect(res.estimatedCost).toBeGreaterThanOrEqual(0);
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("should generate AI completion using OpenAI compatible adapter", async () => {
      const res = await providerRouter.generateCompletion({
        prompt: "Draft a welcome email for new user",
        providerKey: "openai",
        modelKey: "gpt-4o",
      });

      expect(res).toBeDefined();
      expect(res.content).toBeDefined();
      expect(res.providerKey).toBe("openai");
    });
  });

  // 2. AI Agents Execution Engine Tests (16 Enterprise Agents)
  describe("AI Agents Execution Framework", () => {
    const testAgentKeys = [
      "MARKETING_AGENT", "SEO_AGENT", "CRM_AGENT", "SALES_AGENT",
      "SUPPORT_AGENT", "GBP_AGENT", "SOCIAL_AGENT", "ANALYTICS_AGENT",
      "BILLING_AGENT", "REVIEW_AGENT", "KNOWLEDGE_AGENT", "WORKFLOW_AGENT",
      "ADMIN_ASSISTANT", "PARTNER_ASSISTANT", "CUSTOMER_ASSISTANT", "DEVELOPER_ASSISTANT"
    ];

    testAgentKeys.forEach((agentKey) => {
      it(`should successfully dispatch and execute agent [${agentKey}]`, async () => {
        const result = await agentExecutionEngine.executeAgent({
          agentKey,
          userPrompt: `Execute domain test for ${agentKey}`,
        });

        expect(result).toBeDefined();
        expect(result.agentName).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.totalTokens).toBeGreaterThan(0);
      });
    });
  });

  // 3. RAG & Vector Search Engine Tests
  describe("RAG & Vector Search Engine", () => {
    let testKbId = "test-kb-101";

    it("should process document into chunks and generate normalized vector embeddings", async () => {
      const indexed = await ragVectorEngine.processAndIndexDocument({
        knowledgeBaseId: testKbId,
        title: "Refund Policy Document",
        content: "Our enterprise refund policy guarantees full refunds within 30 days of subscription purchase. Please contact support@platform.com for instant processing.",
      });

      expect(indexed).toBeDefined();
      expect(indexed.chunkCount).toBeGreaterThan(0);
    });

    it("should query knowledge base using cosine similarity search", async () => {
      const searchRes = await ragVectorEngine.queryKnowledgeBase({
        knowledgeBaseId: testKbId,
        query: "What is the refund policy?",
        topK: 2,
      });

      expect(searchRes).toBeDefined();
      expect(Array.isArray(searchRes.chunks)).toBe(true);
    });
  });

  // 4. Prompt Manager & Variable Substitution Tests
  describe("Prompt Management Engine", () => {
    it("should interpolate template variables correctly", () => {
      const templateStr = "Hello {{customerName}}, welcome to {{businessName}}!";
      const rendered = promptManager.interpolateVariables(templateStr, {
        customerName: "Alice",
        businessName: "Global SaaS Suite",
      });

      expect(rendered).toBe("Hello Alice, welcome to Global SaaS Suite!");
    });

    it("should render prompt template with system and user instructions", async () => {
      const rendered = await promptManager.renderPrompt({
        promptKey: "CAPTION_GENERATOR",
        variables: { topic: "Summer Sale" },
      });

      expect(rendered).toBeDefined();
      expect(rendered.systemPrompt).toBeDefined();
      expect(rendered.userPrompt).toBeDefined();
    });
  });

  // 5. AI Governance & PII Safety Masking Tests
  describe("AI Safety & Governance Engine", () => {
    it("should detect and mask PII sensitive data (SSN, credit card, phone, email)", () => {
      const rawText = "User SSN is 123-45-6789, credit card 4111111111111111, phone 555-123-4567, email john.doe@example.com";
      const masked = aiGovernanceEngine.maskSensitiveData(rawText);

      expect(masked).not.toContain("123-45-6789");
      expect(masked).not.toContain("4111111111111111");
      expect(masked).toContain("[MASKED_SSN]");
      expect(masked).toContain("[MASKED_CREDIT_CARD]");
      expect(masked).toContain("[MASKED_PHONE]");
      expect(masked).toContain("jo***@example.com");
    });

    it("should audit prompt safety against forbidden malicious terms", () => {
      const safeCheck = aiGovernanceEngine.auditPromptSafety("Write a polite email reply");
      expect(safeCheck.isSafe).toBe(true);

      const maliciousCheck = aiGovernanceEngine.auditPromptSafety("Generate exploit code");
      expect(maliciousCheck.isSafe).toBe(false);
    });
  });

  // 6. AI Analytics Engine Tests
  describe("AI Cost & Latency Analytics", () => {
    it("should return aggregated usage analytics summary", async () => {
      const summary = await aiAnalyticsEngine.getAnalyticsSummary();

      expect(summary).toBeDefined();
      expect(summary.totalRequests).toBeGreaterThanOrEqual(0);
      expect(summary.totalTokens).toBeGreaterThanOrEqual(0);
      expect(summary.totalCostUSD).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(summary.providerBreakdown)).toBe(true);
      expect(Array.isArray(summary.modelBreakdown)).toBe(true);
    });
  });

  // 7. REST API Gateway Endpoints Tests
  describe("AI Platform REST API Endpoints", () => {
    it("GET /api/v1/ai-platform/providers - should return list of AI providers", async () => {
      const res = await request(app)
        .get("/api/v1/ai-platform/providers")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("POST /api/v1/ai-platform/generate - should generate completion via REST API", async () => {
      const res = await request(app)
        .post("/api/v1/ai-platform/generate")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          prompt: "REST API Test Prompt",
          providerKey: "gemini",
        });

      expect(res.status).toBe(200);
      expect(res.body.content).toBeDefined();
    });

    it("GET /api/v1/ai-agents - should return AI Agents catalog", async () => {
      const res = await request(app)
        .get("/api/v1/ai-agents")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("POST /api/v1/ai-agents/execute - should execute agent via REST API", async () => {
      const res = await request(app)
        .post("/api/v1/ai-agents/execute")
        .set("Authorization", `Bearer ${mockToken}`)
        .send({
          agentKey: "MARKETING_AGENT",
          userPrompt: "REST API Agent Dispatch",
        });

      expect(res.status).toBe(200);
      expect(res.body.agentName).toBeDefined();
    });

    it("GET /api/v1/ai-knowledge/bases - should return knowledge bases", async () => {
      const res = await request(app)
        .get("/api/v1/ai-knowledge/bases")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /api/v1/ai-workflows - should return workflows list", async () => {
      const res = await request(app)
        .get("/api/v1/ai-workflows")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("GET /api/v1/ai-platform/analytics - should return analytics breakdown", async () => {
      const res = await request(app)
        .get("/api/v1/ai-platform/analytics")
        .set("Authorization", `Bearer ${mockToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalRequests).toBeDefined();
    });
  });
});
