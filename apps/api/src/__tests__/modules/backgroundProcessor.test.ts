import { backgroundProcessor } from "../../workers/backgroundProcessor";

describe("Phase 8 - Background Processor & Job Queue", () => {
  test("BackgroundProcessor should enqueue and process jobs", (done) => {
    const job = backgroundProcessor.enqueue("test-task-1", { data: 123 });
    expect(job).toHaveProperty("id");
    expect(job.name).toBe("test-task-1");

    setTimeout(() => {
      const stats = backgroundProcessor.getQueueStats();
      expect(stats).toHaveProperty("pendingJobs");
      expect(stats).toHaveProperty("dlqJobs");
      done();
    }, 150);
  });
});
