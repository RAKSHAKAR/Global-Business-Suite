import { UnifiedInboxService } from "../../services/unifiedInboxService";

describe("Unified Inbox Subsystem (Phase 19 Automated Tests)", () => {
  const testTenantId = "test-tenant-inbox-101";

  it("should create a unified conversation across channels and send messages", async () => {
    const conv = await UnifiedInboxService.createConversation({
      tenantId: testTenantId,
      channel: "WHATSAPP",
      subject: "Test WhatsApp Inquiry",
      priority: "HIGH",
      initialMessage: {
        senderType: "CUSTOMER",
        senderName: "Alice Walker",
        content: "Hello, I want to inquire about custom Enterprise licenses.",
      },
    });

    expect(conv.id).toBeDefined();
    expect(conv.channel).toBe("WHATSAPP");
    expect(conv.priority).toBe("HIGH");

    // Send a response
    const agentMsg = await UnifiedInboxService.sendMessage({
      conversationId: conv.id,
      senderType: "AGENT",
      senderName: "Support Spec",
      content: "Hello Alice! We offer flexible enterprise volume licenses.",
    });

    expect(agentMsg.id).toBeDefined();
    expect(agentMsg.conversationId).toBe(conv.id);
  });

  it("should list conversations filtered by channel and search query", async () => {
    const conversations = await UnifiedInboxService.listConversations({
      tenantId: testTenantId,
      channel: "WHATSAPP",
    });

    expect(Array.isArray(conversations)).toBe(true);
    expect(conversations.length).toBeGreaterThan(0);
  });

  it("should generate AI suggested reply and AI summary", async () => {
    const convs = await UnifiedInboxService.listConversations({ tenantId: testTenantId });
    const convId = convs[0].id;

    const replyResult = await UnifiedInboxService.generateAiSuggestedReply(convId, testTenantId);
    expect(replyResult.suggestedReply).toBeDefined();
    expect(typeof replyResult.suggestedReply).toBe("string");

    const summaryResult = await UnifiedInboxService.generateAiSummary(convId, testTenantId);
    expect(summaryResult.summary).toBeDefined();
    expect(summaryResult.summary).toContain("AI Summary");
  });

  it("should support message translation", async () => {
    const convs = await UnifiedInboxService.listConversations({ tenantId: testTenantId });
    const messageId = convs[0].messages[0].id;

    const translated = await UnifiedInboxService.translateMessage(messageId, "es");
    expect(translated.translatedText).toContain("[Translated to ES]");
  });

  it("should support conversation merging", async () => {
    const conv1 = await UnifiedInboxService.createConversation({ tenantId: testTenantId, channel: "EMAIL", subject: "Email 1" });
    const conv2 = await UnifiedInboxService.createConversation({ tenantId: testTenantId, channel: "EMAIL", subject: "Email 2" });

    const mergeResult = await UnifiedInboxService.mergeConversations(conv1.id, [conv2.id], "test-admin", testTenantId);
    expect(mergeResult.success).toBe(true);
    expect(mergeResult.mergedCount).toBe(1);
  });

  it("should configure and list inbox integration providers", async () => {
    const config = await UnifiedInboxService.configureProvider(testTenantId, "TELEGRAM", true, JSON.stringify({ token: "bot123" }));
    expect(config.providerKey).toBe("TELEGRAM");
    expect(config.isEnabled).toBe(true);

    const providers = await UnifiedInboxService.listProviders(testTenantId);
    expect(providers.length).toBeGreaterThan(0);
  });
});
