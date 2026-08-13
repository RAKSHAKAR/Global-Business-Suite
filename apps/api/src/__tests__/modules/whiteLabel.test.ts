import { WhiteLabelService } from "../../services/whiteLabelService";

describe("White-Label Platform Subsystem (Phase 19 Automated Tests)", () => {
  const testTenantId = "test-tenant-whitelabel-104";

  it("should create and update custom white-label branding configuration", async () => {
    const config = await WhiteLabelService.updateWhiteLabelConfig({
      tenantId: testTenantId,
      brandName: "Custom Brand Inc",
      customDomain: "portal.custombrand.com",
      primaryColor: "#E74C3C",
      secondaryColor: "#2C3E50",
      themeMode: "DARK",
    });

    expect(config.tenantId).toBe(testTenantId);
    expect(config.appTitle).toBe("Custom Brand Inc");
    expect(config.primaryColor).toBe("#E74C3C");

    const fetched = await WhiteLabelService.getWhiteLabelConfig(testTenantId);
    expect(fetched.appTitle).toBe("Custom Brand Inc");
  });

  it("should resolve branding by custom CNAME domain", async () => {
    const config = await WhiteLabelService.resolveByDomain("portal.custombrand.com");
    expect(config).toBeDefined();
    expect(config.appTitle).toBeDefined();
  });

  it("should render custom branded PDF/Email template", async () => {
    const template = await WhiteLabelService.renderBrandedTemplate(testTenantId, "EMAIL", { content: "Invoice #101 Details" });
    expect(template.brandTitle).toBe("Custom Brand Inc");
    expect(template.renderedAt).toBeDefined();
  });
});
