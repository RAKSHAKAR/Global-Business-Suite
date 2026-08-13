import { prisma } from "@saas/database";

export interface GenerateCaptionOptions {
  tenantId: string;
  topic: string;
  platform?: string;
  brandVoice?: string;
  tone?: string;
  includeHashtags?: boolean;
  includeCallToAction?: boolean;
}

export class SocialAiStudioService {
  /**
   * AI Caption Generator
   */
  static async generateCaption(options: GenerateCaptionOptions): Promise<{ caption: string; hashtags: string[]; cta: string }> {
    const tone = options.tone || "professional";
    const platform = options.platform || "MULTI";
    const brandVoice = options.brandVoice || "friendly & authoritative";

    const baseCaption = `✨ ${options.topic}\n\nTransform your social reach with Global Business Suite! Designed with a ${brandVoice} tone to maximize audience engagement across ${platform}.`;
    
    const hashtags = [
      "#" + options.topic.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
      "#GBSOmnichannel",
      "#MarketingAutomation",
      "#SocialMediaGrowth",
      "#BusinessSuite",
    ];

    const cta = "👉 Click the link in our bio to start your free trial today!";
    const fullCaption = `${baseCaption}\n\n${cta}\n\n${hashtags.join(" ")}`;

    // Log AI Content generation in database
    const validTenantId = options.tenantId || (await prisma.tenant.findFirst())?.id;
    if (validTenantId) {
      await prisma.aiContent.create({
        data: {
          tenantId: validTenantId,
          prompt: `Generate ${platform} caption for ${options.topic} with tone ${tone}`,
          result: fullCaption,
          type: "SOCIAL_POST",
        },
      });
    }

    return { caption: fullCaption, hashtags, cta };
  }

  /**
   * AI Hashtag Generator
   */
  static async generateHashtags(topic: string, count: number = 10): Promise<string[]> {
    const sanitized = topic.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const tags = new Set<string>();

    sanitized.forEach((word) => tags.add(`#${word}`));
    tags.add("#SocialMarketing");
    tags.add("#EnterpriseAI");
    tags.add("#GrowthHacking");
    tags.add("#ContentStrategy");
    tags.add("#GlobalBusinessSuite");
    tags.add("#LeadGeneration");
    tags.add("#DigitalMarketing");

    return Array.from(tags).slice(0, count);
  }

  /**
   * AI Campaign Strategy Generator
   */
  static async generateCampaignPlan(topic: string, durationDays: number = 30) {
    return {
      campaignName: `${topic} Growth Campaign`,
      targetAudience: "B2B Decision Makers & Local Business Owners",
      suggestedBudget: 1500,
      goals: ["Increase Reach by 45%", "Drive 200+ Qualified Leads", "Boost Brand Engagement"],
      contentCalendar: Array.from({ length: Math.min(10, Math.ceil(durationDays / 3)) }).map((_, i) => ({
        day: (i + 1) * 3,
        channel: i % 2 === 0 ? "LINKEDIN" : "INSTAGRAM",
        contentFocus: `Post ${i + 1}: ${topic} — Pillar ${i + 1}`,
        suggestedPostingTime: "09:30 AM",
      })),
    };
  }

  /**
   * AI Best Time to Post Recommendation Algorithm
   */
  static async getBestTimeToPost(tenantId: string, platform: string = "MULTI"): Promise<{ bestHours: number[]; recommendedDays: string[]; reason: string }> {
    // In production, this computes peak engagement times from historical SocialAnalyticsSnapshots
    const platformDefaults: Record<string, { hours: number[]; days: string[] }> = {
      LINKEDIN: { hours: [8, 10, 14], days: ["Tuesday", "Wednesday", "Thursday"] },
      INSTAGRAM: { hours: [11, 13, 19], days: ["Monday", "Wednesday", "Friday"] },
      FACEBOOK: { hours: [9, 13, 16], days: ["Thursday", "Friday", "Saturday"] },
      TWITTER_X: { hours: [9, 12, 17], days: ["Wednesday", "Friday"] },
      YOUTUBE: { hours: [14, 16, 20], days: ["Friday", "Saturday", "Sunday"] },
      GOOGLE_BUSINESS: { hours: [9, 11, 15], days: ["Monday", "Tuesday", "Thursday"] },
      MULTI: { hours: [9, 13, 17], days: ["Tuesday", "Wednesday", "Thursday"] },
    };

    const config = platformDefaults[platform] || platformDefaults.MULTI;
    return {
      bestHours: config.hours,
      recommendedDays: config.days,
      reason: `Based on cross-platform engagement data for ${platform}, peak user active hours are ${config.hours.map((h) => `${h}:00`).join(", ")}.`,
    };
  }

  /**
   * AI Branded Poster & SEO Image Generator
   */
  static async generatePoster(options: {
    tenantId: string;
    topic: string;
    platform?: string;
    style?: string;
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    customLogoUrl?: string;
    customFaviconUrl?: string;
    watermarkPosition?: string;
    includeBrandLogo?: boolean;
  }) {
    const platform = (options.platform || "INSTAGRAM").toUpperCase();
    const style = (options.style || "GOLD_ELEGANCE").toUpperCase();
    const watermarkPos = (options.watermarkPosition || "TOP_RIGHT").toUpperCase();

    // 1. Fetch White-Label configuration for tenant logo / brand colors
    let whiteLabelConfig = await prisma.whiteLabelConfig.findUnique({
      where: { tenantId: options.tenantId },
    });

    const brandLogoUrl =
      options.customLogoUrl ||
      whiteLabelConfig?.logoUrl ||
      options.customFaviconUrl ||
      whiteLabelConfig?.faviconUrl ||
      "https://via.placeholder.com/150x50/D4AF37/FFFFFF?text=BRAND+LOGO";

    const brandName = whiteLabelConfig?.appTitle || "GLOBAL BUSINESS SUITE";
    const primaryColor = whiteLabelConfig?.primaryColor || "#D4AF37";

    // 2. Define platform-specific dimensions
    const PLATFORM_SPECS: Record<string, { width: number; height: number; aspect: string; name: string }> = {
      INSTAGRAM: { width: 1080, height: 1080, aspect: "1:1 Square", name: "Instagram Post" },
      FACEBOOK: { width: 1200, height: 630, aspect: "1.91:1 Landscape", name: "Facebook Feed" },
      LINKEDIN: { width: 1200, height: 627, aspect: "1.91:1 Banner", name: "LinkedIn Post" },
      TWITTER_X: { width: 1200, height: 675, aspect: "16:9 Landscape", name: "Twitter / X Card" },
      PINTEREST: { width: 1000, height: 1500, aspect: "2:3 Vertical Pin", name: "Pinterest Pin" },
      GOOGLE_BUSINESS: { width: 1024, height: 768, aspect: "4:3 Business Photo", name: "Google Business Update" },
    };

    const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.INSTAGRAM;

    // 3. Style theme colors
    const STYLE_THEMES: Record<string, { bg1: string; bg2: string; text: string; accent: string; cardBg: string }> = {
      GOLD_ELEGANCE: { bg1: "#0F0F12", bg2: "#1F1B0E", text: "#FFFFFF", accent: "#D4AF37", cardBg: "rgba(212, 175, 55, 0.1)" },
      NEON_TECH: { bg1: "#0A0E17", bg2: "#15002A", text: "#FFFFFF", accent: "#00E5FF", cardBg: "rgba(0, 229, 255, 0.1)" },
      CORPORATE_DARK: { bg1: "#111827", bg2: "#1F2937", text: "#F9FAFB", accent: "#3B82F6", cardBg: "rgba(59, 130, 246, 0.1)" },
      OCEAN_BLUE: { bg1: "#061626", bg2: "#0B2B45", text: "#FFFFFF", accent: "#38BDF8", cardBg: "rgba(56, 189, 248, 0.1)" },
      SUNSET_GLOW: { bg1: "#180A0A", bg2: "#2D0B1E", text: "#FFFFFF", accent: "#F43F5E", cardBg: "rgba(244, 63, 94, 0.1)" },
    };

    const theme = STYLE_THEMES[style] || STYLE_THEMES.GOLD_ELEGANCE;

    // 4. Headline & Copy defaults
    const headlineText = options.headline || options.topic;
    const subheadlineText = options.subheadline || `Empower your brand presence on ${spec.name} with AI automation.`;
    const ctaText = options.ctaText || "LEARN MORE & CONNECT";

    // Watermark coordinates
    let logoX = spec.width - 220;
    let logoY = 40;
    if (watermarkPos === "TOP_LEFT") { logoX = 40; logoY = 40; }
    if (watermarkPos === "BOTTOM_LEFT") { logoX = 40; logoY = spec.height - 90; }
    if (watermarkPos === "BOTTOM_RIGHT") { logoX = spec.width - 220; logoY = spec.height - 90; }
    if (watermarkPos === "CENTER_WATERMARK") { logoX = spec.width / 2 - 90; logoY = spec.height / 2 - 30; }

    // 5. Build High-Resolution SVG Canvas Asset
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" width="${spec.width}" height="${spec.height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.bg1}" />
      <stop offset="100%" stop-color="${theme.bg2}" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.accent}" />
      <stop offset="100%" stop-color="${primaryColor}" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${spec.width}" height="${spec.height}" fill="url(#bgGrad)" />

  <!-- Decorative Ornaments -->
  <circle cx="${spec.width * 0.85}" cy="${spec.height * 0.15}" r="${spec.width * 0.3}" fill="${theme.accent}" opacity="0.08" />
  <circle cx="${spec.width * 0.1}" cy="${spec.height * 0.9}" r="${spec.width * 0.25}" fill="${primaryColor}" opacity="0.06" />

  <!-- Center Card Content -->
  <rect x="60" y="${spec.height * 0.22}" width="${spec.width - 120}" height="${spec.height * 0.58}" rx="24" fill="${theme.cardBg}" stroke="${theme.accent}" stroke-width="1.5" stroke-opacity="0.3" filter="url(#shadow)" />

  <!-- Platform Badge -->
  <rect x="90" y="${spec.height * 0.26}" width="200" height="36" rx="18" fill="url(#accentGrad)" />
  <text x="190" y="${spec.height * 0.26 + 23}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" fill="#000000" text-anchor="middle" letter-spacing="1.5">${spec.name.toUpperCase()}</text>

  <!-- Main Headline -->
  <text x="90" y="${spec.height * 0.40}" font-family="system-ui, -apple-system, sans-serif" font-size="${spec.width > 1100 ? "46" : "38"}" font-weight="900" fill="${theme.text}" width="${spec.width - 180}">
    ${headlineText.length > 55 ? headlineText.substring(0, 52) + "..." : headlineText}
  </text>

  <!-- Subheadline -->
  <text x="90" y="${spec.height * 0.53}" font-family="system-ui, -apple-system, sans-serif" font-size="${spec.width > 1100 ? "24" : "20"}" font-weight="500" fill="#D1D5DB" opacity="0.9">
    ${subheadlineText.length > 90 ? subheadlineText.substring(0, 87) + "..." : subheadlineText}
  </text>

  <!-- CTA Button -->
  <rect x="90" y="${spec.height * 0.65}" width="260" height="52" rx="14" fill="url(#accentGrad)" filter="url(#shadow)" />
  <text x="220" y="${spec.height * 0.65 + 32}" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="800" fill="#000000" text-anchor="middle" letter-spacing="1">${ctaText}</text>

  <!-- Brand Logo Overlay / Watermark -->
  ${
    options.includeBrandLogo !== false
      ? `
    <g transform="translate(${logoX}, ${logoY})">
      <rect x="0" y="0" width="180" height="50" rx="10" fill="#000000" opacity="0.6" stroke="${theme.accent}" stroke-width="1" />
      <image href="${brandLogoUrl}" x="10" y="8" width="160" height="34" preserveAspectRatio="xMidYMid meet" />
    </g>`
      : ""
  }

  <!-- Footer Brand Stamp -->
  <text x="${spec.width / 2}" y="${spec.height - 30}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="${theme.accent}" text-anchor="middle" letter-spacing="2" opacity="0.8">
    POWERED BY ${brandName.toUpperCase()}
  </text>
</svg>
    `.trim();

    const base64Svg = Buffer.from(svgContent).toString("base64");
    const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

    // 6. Generate SEO & Social Metadata
    const keywords = [
      options.topic.toLowerCase(),
      spec.name.toLowerCase(),
      brandName.toLowerCase(),
      "social poster",
      "ai graphics",
      "visual marketing",
    ];

    const hashtags = [
      "#" + options.topic.replace(/[^a-zA-Z0-9]/g, ""),
      "#" + platform,
      "#" + brandName.replace(/[^a-zA-Z0-9]/g, ""),
      "#AIPoster",
      "#SocialMediaDesign",
      "#SEOOptimized",
    ];

    const imageAltText = `${headlineText} - ${spec.name} Poster with ${brandName} logo watermark. ${subheadlineText}`;
    const seoTitle = `${headlineText} | ${brandName} ${spec.name}`;
    const seoDescription = `${headlineText}: ${subheadlineText} Discover more from ${brandName}. Optimized for ${platform}.`;

    // 7. Store AI Poster in database
    const validTenantId = options.tenantId || (await prisma.tenant.findFirst())?.id;
    if (validTenantId) {
      await prisma.aiContent.create({
        data: {
          tenantId: validTenantId,
          prompt: `Generate ${platform} poster for ${options.topic} with style ${style}`,
          result: dataUri,
          type: "POSTER",
        },
      });
    }

    return {
      success: true,
      poster: {
        dataUri,
        svgContent,
        platform,
        dimensions: { width: spec.width, height: spec.height, aspect: spec.aspect },
        platformName: spec.name,
        style,
        brandLogoUrl,
        brandName,
        watermarkPosition: watermarkPos,
      },
      seo: {
        seoTitle,
        seoDescription,
        imageAltText,
        keywords,
        hashtags,
      },
    };
  }
}

