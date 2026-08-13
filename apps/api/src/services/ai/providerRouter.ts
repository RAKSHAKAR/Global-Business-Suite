import { prisma } from "@saas/database";

export interface AICompletionRequest {
  tenantId?: string;
  userId?: string;
  agentId?: string;
  workflowId?: string;
  prompt: string;
  systemInstruction?: string;
  modelKey?: string;
  providerKey?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  providerKey: string;
  modelKey: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  isFailoverUsed: boolean;
}

export class ProviderRouter {
  /**
   * Routes AI generation requests across supported AI Providers with automatic failover and token cost tracking.
   */
  public async generateCompletion(req: AICompletionRequest): Promise<AICompletionResponse> {
    const startTime = Date.now();
    const useTestAdapter = process.env.NODE_ENV === "test" || process.env.AI_TEST_MODE === "true";

    // 1. Get active providers sorted by priority
    let providers = await prisma.aiProvider.findMany({
      where: { isActive: true },
      include: { models: { where: { isActive: true } } },
      orderBy: { priority: "asc" },
    });

    if (providers.length === 0 && useTestAdapter) {
      // Tests use an explicit, clearly labelled deterministic adapter. Runtime
      // environments must configure a provider instead of receiving fake output.
      providers = [
        {
          id: "default-gemini",
          name: "Google Gemini",
          providerKey: "gemini",
          apiType: "GEMINI",
          baseUrl: null,
          organizationId: null,
          apiKey: "test-adapter-key",
          priority: 1,
          isFallback: false,
          isActive: true,
          isSelfHosted: false,
          healthStatus: "HEALTHY",
          lastHealthCheckAt: new Date(),
          supportedModalitiesJson: "[\"TEXT\",\"IMAGE\"]",
          rateLimitRpm: 600,
          rateLimitTpm: 100000,
          costMultiplier: 1.0,
          createdAt: new Date(),
          updatedAt: new Date(),
          models: [
            {
              id: "model-gemini-pro",
              providerId: "default-gemini",
              modelKey: "gemini-1.5-pro",
              name: "Gemini 1.5 Pro",
              description: "High intelligence Google Gemini model",
              contextWindow: 1000000,
              maxOutputTokens: 8192,
              inputCostPer1k: 0.00125,
              outputCostPer1k: 0.005,
              supportsStreaming: true,
              supportsVision: true,
              supportsAudio: true,
              supportsEmbeddings: true,
              supportsFunctionCalling: true,
              latencyBenchmarkMs: 320,
              qualityScore: 9.6,
              isDefault: true,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        } as any,
      ];
    } else if (providers.length === 0) {
      throw new Error(
        "No active AI provider is configured. Add an active provider in AI Settings and configure its API key.",
      );
    }

    // Filter or construct requested provider
    if (req.providerKey) {
      const selected = providers.filter((p) => p.providerKey.toLowerCase() === req.providerKey?.toLowerCase());
      if (selected.length > 0) {
        providers = selected;
      } else if (useTestAdapter) {
        // Unit tests may request an adapter without first seeding the catalog.
        providers = [{
          id: `default-${req.providerKey.toLowerCase()}`,
          name: req.providerKey.toUpperCase(),
          providerKey: req.providerKey.toLowerCase(),
          apiType: req.providerKey.toLowerCase() === "gemini" ? "GEMINI" : "OPENAI_COMPATIBLE",
          baseUrl: null,
          organizationId: null,
          apiKey: "test-adapter-key",
          priority: 1,
          isFallback: true,
          isActive: true,
          isSelfHosted: false,
          healthStatus: "HEALTHY",
          lastHealthCheckAt: new Date(),
          supportedModalitiesJson: "[\"TEXT\"]",
          rateLimitRpm: 600,
          rateLimitTpm: 100000,
          costMultiplier: 1.0,
          createdAt: new Date(),
          updatedAt: new Date(),
          models: [{
            id: `model-${req.providerKey.toLowerCase()}`,
            providerId: `default-${req.providerKey.toLowerCase()}`,
            modelKey: req.modelKey || `${req.providerKey.toLowerCase()}-default`,
            name: `${req.providerKey} Default Model`,
            description: `Fallback model for ${req.providerKey}`,
            contextWindow: 128000,
            maxOutputTokens: 4096,
            inputCostPer1k: 0.002,
            outputCostPer1k: 0.006,
            supportsStreaming: true,
            supportsVision: false,
            supportsAudio: false,
            supportsEmbeddings: false,
            supportsFunctionCalling: true,
            latencyBenchmarkMs: 250,
            qualityScore: 9.0,
            isDefault: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        } as any];
      } else {
        throw new Error(`AI provider '${req.providerKey}' is not configured or is inactive.`);
      }
    }

    let lastError: Error | null = null;

    // 2. Iterate through providers with dynamic failover
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const targetModelKey = req.modelKey || provider.models[0]?.modelKey || "gemini-1.5-pro";

      try {
        const responseContent = await this.invokeProviderAdapter(provider, targetModelKey, req);
        const latencyMs = Date.now() - startTime;

        const promptTokens = Math.ceil(req.prompt.length / 4) + (req.systemInstruction ? Math.ceil(req.systemInstruction.length / 4) : 0);
        const completionTokens = Math.ceil(responseContent.length / 4);
        const totalTokens = promptTokens + completionTokens;

        const modelMeta = provider.models.find((m) => m.modelKey === targetModelKey);
        const inputCost = (promptTokens / 1000) * (modelMeta?.inputCostPer1k || 0.0015);
        const outputCost = (completionTokens / 1000) * (modelMeta?.outputCostPer1k || 0.0050);
        const estimatedCost = (inputCost + outputCost) * (provider.costMultiplier || 1.0);

        // Async usage logging
        await prisma.aiUsageLog.create({
          data: {
            tenantId: req.tenantId || null,
            userId: req.userId || null,
            providerKey: provider.providerKey,
            modelKey: targetModelKey,
            promptTokens,
            completionTokens,
            totalTokens,
            estimatedCost,
            latencyMs,
            status: "SUCCESS",
          },
        }).catch((err) => console.error("Failed to record AI usage log:", err));

        return {
          content: responseContent,
          providerKey: provider.providerKey,
          modelKey: targetModelKey,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost,
          latencyMs,
          isFailoverUsed: i > 0,
        };
      } catch (err: any) {
        console.warn(`Provider [${provider.name}] failed: ${err.message}. Attempting failover...`);
        lastError = err;
      }
    }

    throw new Error(`AI Completion failed across all configured providers. Last error: ${lastError?.message || "Unknown error"}`);
  }

  /**
   * Invokes specific provider API adapters (OpenAI, Gemini, Anthropic, Ollama, Custom REST, etc.)
   */
  private async invokeProviderAdapter(provider: any, modelKey: string, req: AICompletionRequest): Promise<string> {
    const pKey = provider.providerKey.toLowerCase();
    const useTestAdapter = process.env.NODE_ENV === "test" || process.env.AI_TEST_MODE === "true";

    if (useTestAdapter) {
      return `[TEST_ADAPTER:${provider.name} | ${modelKey}] AI Generated Output for: "${req.prompt.substring(0, 80)}..."`;
    }

    const configuredKey = (value: unknown): value is string =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      !/^(mock|test|placeholder|your[_-])/i.test(value.trim());

    const readError = async (response: globalThis.Response): Promise<string> => {
      const body = await response.text().catch(() => "");
      return body.slice(0, 500) || response.statusText || "Unknown provider error";
    };

    // 1. Google Gemini API Adapter
    if (pKey === "gemini" || provider.apiType === "GEMINI") {
      const apiKey = provider.apiKey || process.env.GEMINI_API_KEY;
      if (!configuredKey(apiKey)) {
        throw new Error("Gemini is active but has no valid API key configured.");
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelKey)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: req.prompt }] }],
          ...(req.systemInstruction
            ? { systemInstruction: { parts: [{ text: req.systemInstruction }] } }
            : {}),
          generationConfig: {
            temperature: req.temperature ?? 0.7,
            maxOutputTokens: req.maxTokens ?? 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini request failed (${response.status}): ${await readError(response)}`);
      }

      const data = await response.json() as any;
      const text = data.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text)
        .filter(Boolean)
        .join("\n")
        .trim();
      if (!text) throw new Error("Gemini returned no text content.");
      return text;
    }

    // 2. OpenAI / Compatible APIs (DeepSeek, Grok, OpenRouter, Azure, Ollama, LM Studio, Mistral, Perplexity, Cohere)
    if (["openai", "deepseek", "grok", "openrouter", "azure", "ollama", "lmstudio", "mistral", "perplexity", "cohere", "huggingface", "custom"].includes(pKey) || provider.apiType === "OPENAI_COMPATIBLE") {
      const apiKey = provider.apiKey || (pKey === "openai" ? process.env.OPENAI_API_KEY : undefined);
      const allowsKeylessLocal = pKey === "ollama" || pKey === "lmstudio";
      if (!allowsKeylessLocal && !configuredKey(apiKey)) {
        throw new Error(`${provider.name} is active but has no valid API key configured.`);
      }
      const defaultOpenAiBase = pKey === "openai" ? "https://api.openai.com/v1" : undefined;
      const baseUrl = String(provider.baseUrl || defaultOpenAiBase || "").replace(/\/$/, "");
      if (!baseUrl) throw new Error(`${provider.name} requires a base URL.`);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (configuredKey(apiKey)) headers.Authorization = `Bearer ${apiKey}`;
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: modelKey,
          messages: [
            ...(req.systemInstruction ? [{ role: "system", content: req.systemInstruction }] : []),
            { role: "user", content: req.prompt },
          ],
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`${provider.name} request failed (${response.status}): ${await readError(response)}`);
      }

      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error(`${provider.name} returned no text content.`);
      return text;
    }

    // 3. Anthropic Claude Adapter
    if (pKey === "anthropic" || provider.apiType === "ANTHROPIC") {
      const apiKey = provider.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!configuredKey(apiKey)) {
        throw new Error("Anthropic is active but has no valid API key configured.");
      }
      const response = await fetch(`${String(provider.baseUrl || "https://api.anthropic.com/v1").replace(/\/$/, "")}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelKey,
          max_tokens: req.maxTokens ?? 2048,
          temperature: req.temperature ?? 0.7,
          ...(req.systemInstruction ? { system: req.systemInstruction } : {}),
          messages: [{ role: "user", content: req.prompt }],
        }),
      });
      if (!response.ok) {
        throw new Error(`Anthropic request failed (${response.status}): ${await readError(response)}`);
      }
      const data = await response.json() as any;
      const text = data.content?.map((part: any) => part?.text).filter(Boolean).join("\n").trim();
      if (!text) throw new Error("Anthropic returned no text content.");
      return text;
    }

    throw new Error(`Unsupported AI provider adapter: ${provider.providerKey}`);
  }
}

export const providerRouter = new ProviderRouter();
