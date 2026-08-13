import { prisma } from "@saas/database";

export interface UpdateWhiteLabelInput {
  tenantId: string;
  appTitle?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  themeMode?: string;
  customCss?: string;
  brandName?: string;
  customDomain?: string;
  typographyFont?: string;
  customEmailHeaderHtml?: string;
  customPdfLogoUrl?: string;
  customInvoiceFooter?: string;
  brandedAiName?: string;
  featureBrandingJson?: string;
  perTenantOverridesJson?: string;
}

export class WhiteLabelService {
  /**
   * Get or initialize White-Label configuration for a tenant / domain
   */
  static async getWhiteLabelConfig(tenantId: string) {
    let config = await prisma.whiteLabelConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      config = await prisma.whiteLabelConfig.create({
        data: {
          tenantId,
          appTitle: "Global Business Suite",
          primaryColor: "#D4AF37",
          secondaryColor: "#1A1A1A",
          themeMode: "DARK",
        },
      });
    }

    return config;
  }

  /**
   * Update White-Label configuration
   */
  static async updateWhiteLabelConfig(input: UpdateWhiteLabelInput) {
    const config = await prisma.whiteLabelConfig.upsert({
      where: { tenantId: input.tenantId },
      create: {
        tenantId: input.tenantId,
        appTitle: input.brandName || input.appTitle || "Global Business Suite",
        logoUrl: input.logoUrl,
        faviconUrl: input.faviconUrl,
        primaryColor: input.primaryColor || "#D4AF37",
        secondaryColor: input.secondaryColor || "#1A1A1A",
        themeMode: input.themeMode || "DARK",
        customCss: input.customCss,
      },
      update: {
        ...(input.appTitle || input.brandName ? { appTitle: input.brandName || input.appTitle } : {}),
        ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
        ...(input.faviconUrl ? { faviconUrl: input.faviconUrl } : {}),
        ...(input.primaryColor ? { primaryColor: input.primaryColor } : {}),
        ...(input.secondaryColor ? { secondaryColor: input.secondaryColor } : {}),
        ...(input.themeMode ? { themeMode: input.themeMode } : {}),
        ...(input.customCss ? { customCss: input.customCss } : {}),
      },
    });

    // Also update Tenant record domain and branding settings if tenant exists
    if (input.customDomain || input.brandName || input.logoUrl || input.primaryColor) {
      await prisma.tenant.updateMany({
        where: { id: input.tenantId },
        data: {
          ...(input.customDomain ? { domain: input.customDomain } : {}),
          ...(input.brandName ? { name: input.brandName } : {}),
          ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
          ...(input.primaryColor ? { primaryColor: input.primaryColor } : {}),
        },
      });
    }

    return config;
  }

  /**
   * Resolve White-Label configuration by Custom Domain
   */
  static async resolveByDomain(domain: string) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { domain: domain },
          { subdomain: domain },
        ],
      },
    });

    if (!tenant) {
      return {
        appTitle: "Global Business Suite",
        primaryColor: "#D4AF37",
        secondaryColor: "#1A1A1A",
        themeMode: "DARK",
      };
    }

    return await this.getWhiteLabelConfig(tenant.id);
  }

  /**
   * Render custom branded PDF / HTML Header
   */
  static async renderBrandedTemplate(tenantId: string, templateType: "EMAIL" | "PDF" | "INVOICE", data: Record<string, any>) {
    const config = await this.getWhiteLabelConfig(tenantId);
    
    return {
      headerLogo: config.logoUrl || "/assets/logo.png",
      brandTitle: config.appTitle || "Global Business Suite",
      primaryColor: config.primaryColor || "#D4AF37",
      bodyHtml: `<div><h1>${config.appTitle}</h1><p>${data.content || ""}</p></div>`,
      renderedAt: new Date(),
    };
  }
}
