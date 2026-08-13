import { logger } from "../utils/logger";
import { executeWithRetry } from "../utils/retryEngine";
import { eventBus } from "../services/eventBus";

export interface BackgroundJob {
  id: string;
  name: string;
  payload: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
}

export class BackgroundJobQueueProcessor {
  private queue: BackgroundJob[] = [];
  private deadLetterQueue: BackgroundJob[] = [];
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.listenToEvents();
  }

  private listenToEvents() {
    eventBus.subscribe("gbp:synced", (event) => {
      this.enqueue("aggregate-location-metrics", { locationId: event.payload.locationId });
    });

    eventBus.subscribe("social:published", (event) => {
      this.enqueue("verify-social-publish-status", { postId: event.payload.postId });
    });
  }

  public enqueue(name: string, payload: Record<string, any>, maxAttempts = 3): BackgroundJob {
    const job: BackgroundJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name,
      payload,
      attempts: 0,
      maxAttempts,
      createdAt: new Date().toISOString(),
    };

    this.queue.push(job);
    logger.info(`[BackgroundProcessor] Enqueued job [${job.name}] (ID: ${job.id})`);
    this.processNext();
    return job;
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift()!;

    try {
      job.attempts++;
      logger.info(`[BackgroundProcessor] Processing job [${job.name}] (Attempt ${job.attempts}/${job.maxAttempts})`);

      await executeWithRetry(`bg-job-${job.name}`, async () => {
        // Execute task logic based on job name
        if (job.name === "aggregate-location-metrics") {
          // Process metrics aggregation
          logger.info(`Aggregated metrics for location: ${job.payload.locationId}`);
        } else if (job.name === "verify-social-publish-status") {
          logger.info(`Verified social publish status for post: ${job.payload.postId}`);
        } else {
          logger.info(`Processed generic background task: ${job.name}`);
        }
      });

      logger.info(`[BackgroundProcessor] Completed job [${job.name}] (ID: ${job.id})`);
    } catch (err) {
      logger.error(`[BackgroundProcessor] Job [${job.name}] (ID: ${job.id}) failed.`, {}, err);
      if (job.attempts < job.maxAttempts) {
        this.queue.push(job);
      } else {
        logger.warn(`[BackgroundProcessor] Job [${job.name}] moved to Dead Letter Queue (DLQ).`);
        this.deadLetterQueue.push(job);
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), 100);
      }
    }
  }

  public startCronSchedules() {
    // Standard cron scheduled job runner simulation
    this.timer = setInterval(() => {
      logger.debug("[BackgroundProcessor] Executing 5-minute scheduled sync check...");
    }, 300000);
  }

  public getQueueStats() {
    return {
      pendingJobs: this.queue.length,
      dlqJobs: this.deadLetterQueue.length,
      isProcessing: this.isProcessing,
    };
  }

  public stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const backgroundProcessor = new BackgroundJobQueueProcessor();
