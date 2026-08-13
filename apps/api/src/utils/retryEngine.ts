import { logger } from "./logger";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  circuitBreakerThreshold?: number;
}

export class CircuitBreakerOpenError extends Error {
  constructor(message = "Circuit breaker is OPEN. Target service is unavailable.") {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

class CircuitBreaker {
  private failureCount = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private nextAttempt = Date.now();
  private threshold: number;

  constructor(threshold = 5) {
    this.threshold = threshold;
  }

  public recordSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  public recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + 30000; // 30 second cooldown
      logger.warn(`[CircuitBreaker] Breaker OPENED due to ${this.failureCount} consecutive failures.`);
    }
  }

  public canExecute(): boolean {
    if (this.state === "CLOSED") return true;
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttempt) {
        this.state = "HALF_OPEN";
        return true;
      }
      return false;
    }
    return true; // HALF_OPEN allows test request
  }
}

const circuitBreakers = new Map<string, CircuitBreaker>();

export async function executeWithRetry<T>(
  taskName: string,
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 200;
  const maxDelayMs = options.maxDelayMs ?? 5000;
  const backoffFactor = options.backoffFactor ?? 2;

  let cb = circuitBreakers.get(taskName);
  if (!cb) {
    cb = new CircuitBreaker(options.circuitBreakerThreshold ?? 5);
    circuitBreakers.set(taskName, cb);
  }

  if (!cb.canExecute()) {
    throw new CircuitBreakerOpenError(`Service [${taskName}] circuit breaker is OPEN.`);
  }

  let attempt = 0;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      const result = await fn();
      cb.recordSuccess();
      return result;
    } catch (err: any) {
      attempt++;
      cb.recordFailure();

      if (attempt > maxRetries) {
        logger.error(`[RetryEngine] Task [${taskName}] failed after ${maxRetries} retries.`, {}, err);
        throw err;
      }

      const jitter = Math.random() * 100;
      const actualDelay = Math.min(delay * Math.pow(backoffFactor, attempt - 1) + jitter, maxDelayMs);
      
      logger.warn(`[RetryEngine] Task [${taskName}] attempt ${attempt} failed. Retrying in ${Math.round(actualDelay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, actualDelay));
    }
  }

  throw new Error(`[RetryEngine] Unexpected exit from retry loop for task [${taskName}]`);
}
