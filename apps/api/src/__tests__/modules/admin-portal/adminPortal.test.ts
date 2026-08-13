import { AdminCenterService } from "../../../services/adminCenterService";

describe("Phase 4 Admin Portal Module Test Suite", () => {
  it("fetches platform telemetry and dashboard stats", async () => {
    const stats = await AdminCenterService.getDashboardStats();
    expect(stats.systemHealth).toBe("OPERATIONAL");
    expect(stats.tenants).toBeDefined();
  });

  it("updates white-label custom branding settings", async () => {
    const updatedBranding = await AdminCenterService.upsertWhiteLabel({
      appTitle: "Enterprise Suite Pro",
      primaryColor: "#D4AF37",
      themeMode: "DARK",
    });
    expect(updatedBranding.appTitle).toBe("Enterprise Suite Pro");

    const fetched = await AdminCenterService.getWhiteLabel();
    expect(fetched?.primaryColor).toBe("#D4AF37");
  });

  it("increments AI prompt template versioning studio", async () => {
    const testKey = `TEST_CAPTION_${Date.now()}`;
    const p1 = await AdminCenterService.upsertPromptTemplate({
      key: testKey,
      title: "Test Caption Prompt",
      systemPrompt: "System instruction v1",
      userPrompt: "Generate caption for {{topic}}",
    });
    expect(p1.version).toBe(1);

    const p2 = await AdminCenterService.upsertPromptTemplate({
      key: testKey,
      title: "Test Caption Prompt V2",
      systemPrompt: "System instruction v2",
      userPrompt: "Generate caption for {{topic}}",
    });
    expect(p2.version).toBe(2);
  });

  it("manages centralized notification templates", async () => {
    const template = await AdminCenterService.upsertNotificationTemplate({
      key: "WELCOME_TEST",
      channel: "EMAIL",
      subject: "Welcome to Platform",
      body: "Hello {{name}}, welcome!",
    });
    expect(template.channel).toBe("EMAIL");
  });

  it("executes unified global command search", async () => {
    const searchResult = await AdminCenterService.globalSearch("Admin");
    expect(Array.isArray(searchResult.results)).toBe(true);
  });
});
