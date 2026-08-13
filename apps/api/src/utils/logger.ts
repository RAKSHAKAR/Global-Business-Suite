export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  service?: string;
  module?: string;
  [key: string]: any;
}

export class Logger {
  private serviceName: string;

  constructor(serviceName = "gbs-api-gateway") {
    this.serviceName = serviceName;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
    err?: Error | any,
  ) {
    const entry: Record<string, any> = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...(context || {}),
    };

    if (err) {
      entry.error = {
        message: err.message || String(err),
        stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
        code: err.code,
      };
    }

    return JSON.stringify(entry);
  }

  public debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  public info(message: string, context?: LogContext) {
    console.log(this.formatMessage("info", message, context));
  }

  public warn(message: string, context?: LogContext, err?: Error | any) {
    console.warn(this.formatMessage("warn", message, context, err));
  }

  public error(message: string, context?: LogContext, err?: Error | any) {
    console.error(this.formatMessage("error", message, context, err));
  }
}

export const logger = new Logger();
