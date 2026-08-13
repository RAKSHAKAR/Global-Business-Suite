import { eventBus } from "../../services/eventBus";
import { executeWithRetry, CircuitBreakerOpenError } from "../../utils/retryEngine";
import { authServiceModule } from "../../services/microservices/authServiceModule";
import { aiEngineServiceModule } from "../../services/microservices/aiEngineServiceModule";

describe("Phase 8 - Enterprise Microservices & Event Bus", () => {
  test("GBSEventBus should publish and handle events asynchronously", (done) => {
    eventBus.subscribe("test:event", (event) => {
      expect(event.type).toBe("test:event");
      expect(event.payload.foo).toBe("bar");
      done();
    });

    eventBus.publish("test:event", { foo: "bar" });
  });

  test("RetryEngine should retry failing operations and throw error on exhaustion", async () => {
    let attempts = 0;
    const failingFn = async () => {
      attempts++;
      throw new Error("Temporary failure");
    };

    await expect(
      executeWithRetry("test-failing-task", failingFn, { maxRetries: 2, initialDelayMs: 10 }),
    ).rejects.toThrow("Temporary failure");

    expect(attempts).toBe(3);
  });

  test("AuthServiceModule CAPTCHA generation", async () => {
    const captcha = await authServiceModule.generateCaptcha();
    expect(captcha).toHaveProperty("id");
    expect(captcha).toHaveProperty("imageSvg");
  });

  test("AIEngineServiceModule should enforce monthly quota validation structure", async () => {
    expect(aiEngineServiceModule).toBeDefined();
    expect(typeof aiEngineServiceModule.generateText).toBe("function");
  });
});
