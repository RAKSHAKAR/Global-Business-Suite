import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface RequestWithId extends Request {
  id?: string;
  requestId?: string;
}

/**
 * Enterprise Request ID Middleware
 * Assigns or propagates a unique correlation ID (x-request-id) for every incoming HTTP request.
 */
export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) {
  const incomingRequestId = req.headers["x-request-id"] as string;
  const requestId = incomingRequestId || (crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  req.id = requestId;
  req.requestId = requestId;

  res.setHeader("X-Request-ID", requestId);
  next();
}
