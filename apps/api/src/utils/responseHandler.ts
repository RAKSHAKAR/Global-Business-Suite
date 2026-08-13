import { Response } from "express";

export class AppError extends Error {
  public statusCode: number;
  public errorCode?: string;
  public details?: any;

  constructor(message: string, statusCode = 500, errorCode?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface StandardMeta {
  timestamp: string;
  requestId?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  [key: string]: any;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  extraMeta?: Record<string, any>,
) {
  const requestId = (res.req as any)?.requestId || (res.req as any)?.id;
  const meta: StandardMeta = {
    timestamp: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    ...extraMeta,
  };

  return res.status(statusCode).json({
    success: true,
    data,
    meta,
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number; pages: number },
  statusCode = 200,
) {
  const requestId = (res.req as any)?.requestId || (res.req as any)?.id;
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
      pagination,
    },
    // Top-level legacy fields for backward compatibility
    pagination,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errorCode?: string,
  details?: any,
) {
  const requestId = (res.req as any)?.requestId || (res.req as any)?.id;
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(errorCode ? { code: errorCode } : {}),
    errorDetails: {
      message,
      ...(errorCode ? { code: errorCode } : {}),
      ...(details !== undefined ? { details } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    },
  });
}
