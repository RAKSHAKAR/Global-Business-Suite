import { CallCenterService } from "../../services/callCenterService";

describe("Enterprise Call Center Subsystem (Phase 19 Automated Tests)", () => {
  const testTenantId = "test-tenant-calls-102";

  it("should log calls, trigger AI analysis, and query call logs", async () => {
    const call = await CallCenterService.logCall({
      tenantId: testTenantId,
      callType: "INCOMING",
      callMode: "BROWSER",
      callerNumber: "+1 (555) 123-4567",
      calleeNumber: "+1 (800) 555-0199",
      durationSec: 120,
      callNotes: "Customer requested info about enterprise call queues.",
    });

    expect(call.id).toBeDefined();
    expect(call.callType).toBe("INCOMING");
    expect(call.aiSummary).toBeDefined();
    expect(call.aiSentiment).toBe("POSITIVE");

    const callsList = await CallCenterService.listCalls(testTenantId);
    expect(callsList.length).toBeGreaterThan(0);
  });

  it("should schedule and list callback requests", async () => {
    const callback = await CallCenterService.scheduleCallback({
      tenantId: testTenantId,
      phoneNumber: "+1 (555) 987-6543",
      scheduledTime: new Date(Date.now() + 3600 * 1000),
      notes: "Call back after lunch regarding custom quote.",
    });

    expect(callback.id).toBeDefined();
    expect(callback.status).toBe("PENDING");

    const list = await CallCenterService.listCallbacks(testTenantId);
    expect(list.length).toBeGreaterThan(0);
  });

  it("should configure call queue routing and IVR menus", async () => {
    const queue = await CallCenterService.configureQueue(testTenantId, "Support Queue", "ROUND_ROBIN", "[\"u1\",\"u2\"]", 300);
    expect(queue.queueName).toBe("Support Queue");
    expect(queue.routingType).toBe("ROUND_ROBIN");

    const ivr = await CallCenterService.configureIvr(testTenantId, "Main IVR Tree", "[]");
    expect(ivr.name).toBe("Main IVR Tree");
  });

  it("should generate call analytics", async () => {
    const analytics = await CallCenterService.getCallAnalytics(testTenantId);
    expect(analytics.totalCalls).toBeGreaterThanOrEqual(1);
    expect(analytics.answerRatePercent).toBeGreaterThanOrEqual(0);
  });
});
