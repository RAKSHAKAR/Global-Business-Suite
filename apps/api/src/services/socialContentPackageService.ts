import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@saas/database";

const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";
const DEFAULT_OPENAI_TEXT_MODEL = "gpt-5-mini";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1";

export const generatedMediaRoot = path.resolve(
  process.env.GENERATED_MEDIA_DIR || path.join(__dirname, "..", "..", ".generated-media"),
);

export class AiProviderConfigurationError extends Error {
  readonly code = "AI_PROVIDER_NOT_CONFIGURED";
  readonly status = 503;

  constructor(message = "Configure GEMINI_API_KEY or OPENAI_API_KEY before generating content.") {
    super(message);
    this.name = "AiProviderConfigurationError";
  }
}

export class AiProviderRequestError extends Error {
  readonly code = "AI_PROVIDER_REQUEST_FAILED";
  readonly status = 502;

  constructor(message: string) {
    super(message);
    this.name = "AiProviderRequestError";
  }
}

export interface GenerateContentPackageOptions {
  tenantId: string;
  userId: string;
  topic: string;
  platforms: string[];
  tone?: string;
  brandVoice?: string;
  callToAction?: string;
  imageStyle?: string;
  aspectRatio?: string;
  imageSize?: "0.5K" | "1K" | "2K" | "4K";
  feedback?: string;
}

interface ProviderPackage {
  caption: string;
  imageBase64: string;
  mimeType: string;
  provider: "gemini" | "openai" | "test";
  model: string;
  interactionId?: string;
}

function hasUsableKey(value: string | undefined): value is string {
  return Boolean(value && value.trim() && !value.toLowerCase().includes("replace_with"));
}

function normalizePlatforms(platforms: unknown): string[] {
  if (!Array.isArray(platforms)) return [];
  return Array.from(
    new Set(
      platforms
        .filter((platform): platform is string => typeof platform === "string")
        .map((platform) => platform.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 13);
}

function extractGeminiOutput(payload: any): { text?: string; image?: { data: string; mimeType: string } } {
  const result: { text?: string; image?: { data: string; mimeType: string } } = {};

  if (typeof payload?.output_text === "string") result.text = payload.output_text;
  if (typeof payload?.outputText === "string") result.text = payload.outputText;

  const directImage = payload?.output_image || payload?.outputImage;
  if (directImage?.data) {
    result.image = {
      data: directImage.data,
      mimeType: directImage.mime_type || directImage.mimeType || "image/png",
    };
  }

  for (const step of Array.isArray(payload?.steps) ? payload.steps : []) {
    if (step?.type !== "model_output" && step?.type !== "modelOutput") continue;
    for (const block of Array.isArray(step?.content) ? step.content : []) {
      if (block?.type === "text" && typeof block.text === "string") result.text = block.text;
      if (block?.type === "image" && typeof block.data === "string") {
        result.image = {
          data: block.data,
          mimeType: block.mime_type || block.mimeType || "image/png",
        };
      }
    }
  }

  return result;
}

function extractOpenAiText(payload: any): string | undefined {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const block of Array.isArray(item?.content) ? item.content : []) {
      if ((block?.type === "output_text" || block?.type === "text") && typeof block.text === "string") {
        return block.text;
      }
    }
  }
  return undefined;
}

function cleanCaption(value: string): string {
  return value
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^caption\s*:\s*/i, "")
    .trim();
}

function getExtension(mimeType: string): string {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  return "png";
}

function publicApiBaseUrl(): string {
  return (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, "");
}

async function requestJson(url: string, init: RequestInit, provider: string): Promise<any> {
  let response: globalThis.Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000) });
  } catch (error: any) {
    throw new AiProviderRequestError(`${provider} request could not be completed: ${error?.message || "network error"}`);
  }

  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const providerMessage = data?.error?.message || data?.message || raw.slice(0, 300) || `HTTP ${response.status}`;
    throw new AiProviderRequestError(`${provider} returned ${response.status}: ${providerMessage}`);
  }
  return data;
}

export class SocialContentPackageService {
  static providerStatus() {
    const testAdapter = process.env.NODE_ENV !== "production" && process.env.AI_TEST_MODE === "true";
    const geminiConfigured = hasUsableKey(process.env.GEMINI_API_KEY);
    const openAiConfigured = hasUsableKey(process.env.OPENAI_API_KEY);
    const preferred = (process.env.AI_CONTENT_PROVIDER || "auto").toLowerCase();
    return {
      configured: testAdapter || geminiConfigured || openAiConfigured,
      preferred: testAdapter ? "test" : preferred,
      providers: {
        test: { configured: testAdapter, model: "gbs-e2e-content-package" },
        gemini: {
          configured: geminiConfigured,
          model: process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL,
        },
        openai: {
          configured: openAiConfigured,
          textModel: process.env.OPENAI_TEXT_MODEL || DEFAULT_OPENAI_TEXT_MODEL,
          imageModel: process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL,
        },
      },
    };
  }

  static normalizePlatforms = normalizePlatforms;

  static async generate(options: GenerateContentPackageOptions): Promise<ProviderPackage> {
    // Deterministic adapter for the isolated Playwright-owned API process only.
    // Normal setup/dev servers never set AI_TEST_MODE and therefore still
    // require a real Gemini or OpenAI credential.
    if (process.env.NODE_ENV !== "production" && process.env.AI_TEST_MODE === "true") {
      const result: ProviderPackage = {
        caption: `Test campaign: ${options.topic}\n\n#GBS #ApprovalRequired #ContentAutomation`,
        imageBase64:
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        mimeType: "image/png",
        provider: "test",
        model: "gbs-e2e-content-package",
        interactionId: `e2e-${randomUUID()}`,
      };
      await prisma.aiContent.create({
        data: {
          tenantId: options.tenantId,
          prompt: options.topic,
          result: JSON.stringify({ caption: result.caption, provider: result.provider, model: result.model }),
          type: "SOCIAL_CONTENT_PACKAGE",
        },
      });
      return result;
    }

    const status = this.providerStatus();
    if (!status.configured) throw new AiProviderConfigurationError();

    const brand = await prisma.whiteLabelConfig.findUnique({ where: { tenantId: options.tenantId } });
    const brandName = brand?.appTitle || "the business";
    const prompt = [
      `Create one publication-ready social media post and one coordinated marketing image for ${brandName}.`,
      `Topic: ${options.topic}.`,
      `Platforms: ${options.platforms.join(", ")}.`,
      `Tone: ${options.tone || "professional, natural, and engaging"}.`,
      `Brand voice: ${options.brandVoice || "clear, trustworthy, and useful"}.`,
      options.callToAction ? `Call to action: ${options.callToAction}.` : "Include one concise, relevant call to action.",
      `Image direction: ${options.imageStyle || "polished commercial editorial design"}.`,
      brand?.primaryColor ? `Use ${brand.primaryColor} as a visual accent where appropriate.` : "",
      options.feedback ? `Revision feedback that must be applied: ${options.feedback}.` : "",
      "Return the final caption as plain text, including 3-6 relevant hashtags. Do not prefix it with a label or put it in a code fence.",
      "The image must be usable as the visual paired with that exact caption. Do not render long paragraphs of text inside the image.",
    ].filter(Boolean).join("\n");

    const preferred = status.preferred;
    const attempts: Array<() => Promise<ProviderPackage>> = [];
    if (preferred === "openai") {
      if (status.providers.openai.configured) attempts.push(() => this.generateWithOpenAi(prompt, options));
      if (status.providers.gemini.configured) attempts.push(() => this.generateWithGemini(prompt, options));
    } else {
      if (status.providers.gemini.configured) attempts.push(() => this.generateWithGemini(prompt, options));
      if (status.providers.openai.configured) attempts.push(() => this.generateWithOpenAi(prompt, options));
    }

    const errors: string[] = [];
    for (const attempt of attempts) {
      try {
        const result = await attempt();
        await prisma.aiContent.create({
          data: {
            tenantId: options.tenantId,
            prompt,
            result: JSON.stringify({ caption: result.caption, provider: result.provider, model: result.model }),
            type: "SOCIAL_CONTENT_PACKAGE",
          },
        });
        return result;
      } catch (error: any) {
        errors.push(error?.message || "provider request failed");
      }
    }

    throw new AiProviderRequestError(`All configured content providers failed. ${errors.join(" | ")}`);
  }

  private static async generateWithGemini(
    prompt: string,
    options: GenerateContentPackageOptions,
  ): Promise<ProviderPackage> {
    const key = process.env.GEMINI_API_KEY!;
    const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_GEMINI_IMAGE_MODEL;
    const data = await requestJson(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          model,
          input: prompt,
          response_format: [
            { type: "text" },
            {
              type: "image",
              mime_type: "image/png",
              aspect_ratio: options.aspectRatio || "1:1",
              image_size: options.imageSize || "1K",
            },
          ],
        }),
      },
      "Gemini",
    );
    const output = extractGeminiOutput(data);
    if (!output.text || !output.image?.data) {
      throw new AiProviderRequestError("Gemini did not return both the requested caption and image.");
    }
    return {
      caption: cleanCaption(output.text),
      imageBase64: output.image.data,
      mimeType: output.image.mimeType,
      provider: "gemini",
      model,
      interactionId: data?.id,
    };
  }

  private static async generateWithOpenAi(
    prompt: string,
    options: GenerateContentPackageOptions,
  ): Promise<ProviderPackage> {
    const key = process.env.OPENAI_API_KEY!;
    const textModel = process.env.OPENAI_TEXT_MODEL || DEFAULT_OPENAI_TEXT_MODEL;
    const imageModel = process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL;
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
    const sizeByAspect: Record<string, string> = {
      "1:1": "1024x1024",
      "4:5": "1024x1536",
      "3:4": "1024x1536",
      "16:9": "1536x1024",
      "1.91:1": "1536x1024",
    };

    const [textPayload, imagePayload] = await Promise.all([
      requestJson(
        "https://api.openai.com/v1/responses",
        { method: "POST", headers, body: JSON.stringify({ model: textModel, input: prompt }) },
        "OpenAI text",
      ),
      requestJson(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: imageModel,
            prompt,
            n: 1,
            size: sizeByAspect[options.aspectRatio || "1:1"] || "1024x1024",
            output_format: "png",
          }),
        },
        "OpenAI image",
      ),
    ]);

    const caption = extractOpenAiText(textPayload);
    const imageBase64 = imagePayload?.data?.[0]?.b64_json;
    if (!caption || !imageBase64) {
      throw new AiProviderRequestError("OpenAI did not return both the requested caption and image.");
    }
    return {
      caption: cleanCaption(caption),
      imageBase64,
      mimeType: "image/png",
      provider: "openai",
      model: `${textModel} + ${imageModel}`,
    };
  }

  static async persistImage(tenantId: string, imageBase64: string, mimeType: string) {
    const buffer = Buffer.from(imageBase64, "base64");
    if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
      throw new AiProviderRequestError("Generated image payload is empty or exceeds the 20 MB storage limit.");
    }
    const extension = getExtension(mimeType);
    const fileName = `${randomUUID()}.${extension}`;
    const tenantDirectory = path.join(generatedMediaRoot, tenantId);
    await mkdir(tenantDirectory, { recursive: true });
    await writeFile(path.join(tenantDirectory, fileName), buffer, { flag: "wx" });
    return {
      fileName,
      fileSize: buffer.length,
      fileUrl: `${publicApiBaseUrl()}/generated-media/${encodeURIComponent(tenantId)}/${fileName}`,
      mimeType,
    };
  }
}
