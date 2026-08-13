import { prisma } from "@saas/database";

export interface PromptRenderRequest {
  promptKey?: string;
  templateId?: string;
  variables: Record<string, string>;
  tenantId?: string;
}

export class PromptManager {
  /**
   * Renders a prompt template by replacing {{variable}} placeholders with values.
   */
  public async renderPrompt(req: PromptRenderRequest): Promise<{ systemPrompt: string; userPrompt: string; modelKey: string }> {
    let template: any = null;

    if (req.templateId) {
      template = await prisma.promptTemplate.findUnique({ where: { id: req.templateId } });
    } else if (req.promptKey) {
      template = await prisma.promptTemplate.findFirst({
        where: {
          key: req.promptKey,
          ...(req.tenantId ? { OR: [{ tenantId: req.tenantId }, { tenantId: null }] } : {}),
        },
        orderBy: { version: "desc" },
      });
    }

    if (!template) {
      // System default prompts
      return {
        systemPrompt: "You are an enterprise AI assistant.",
        userPrompt: this.interpolateVariables(req.promptKey || "Default Prompt", req.variables),
        modelKey: "gemini-1.5-pro",
      };
    }

    const renderedSystem = this.interpolateVariables(template.systemPrompt, req.variables);
    const renderedUser = this.interpolateVariables(template.userPrompt, req.variables);

    // Update usage count asynchronously
    await prisma.promptTemplate.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 } },
    }).catch(() => null);

    return {
      systemPrompt: renderedSystem,
      userPrompt: renderedUser,
      modelKey: template.modelKey || "gemini-1.5-pro",
    };
  }

  /**
   * Replaces placeholders like {{businessName}}, {{customerName}}, {{topic}} with string values.
   */
  public interpolateVariables(templateStr: string, variables: Record<string, string>): string {
    let result = templateStr;
    for (const [key, val] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      result = result.replace(regex, val || "");
    }
    return result;
  }

  /**
   * Imports prompt templates from a JSON array.
   */
  public async importPrompts(templates: any[], tenantId?: string): Promise<{ importedCount: number }> {
    let count = 0;
    for (const item of templates) {
      if (!item.key || !item.title || !item.userPrompt) continue;

      await prisma.promptTemplate.upsert({
        where: { key: item.key },
        update: {
          title: item.title,
          category: item.category || "GENERAL",
          systemPrompt: item.systemPrompt || "You are an enterprise AI assistant.",
          userPrompt: item.userPrompt,
          variablesJson: JSON.stringify(item.variables || []),
          version: (item.version || 1),
          approvalStatus: item.approvalStatus || "APPROVED",
          tenantId: tenantId || null,
        },
        create: {
          key: item.key,
          title: item.title,
          category: item.category || "GENERAL",
          systemPrompt: item.systemPrompt || "You are an enterprise AI assistant.",
          userPrompt: item.userPrompt,
          variablesJson: JSON.stringify(item.variables || []),
          version: item.version || 1,
          approvalStatus: item.approvalStatus || "APPROVED",
          tenantId: tenantId || null,
        },
      });
      count++;
    }
    return { importedCount: count };
  }
}

export const promptManager = new PromptManager();
