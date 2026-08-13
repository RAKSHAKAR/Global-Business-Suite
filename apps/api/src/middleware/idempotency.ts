import { Request, Response, NextFunction } from "express";

interface CachedResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: any;
  createdAt: number;
}

const idempotencyCache = new Map<string, CachedResponse>();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Enterprise Idempotency Middleware
 * Intercepts POST and PUT requests with x-idempotency-key header to prevent duplicate execution.
 */
export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const idempotencyKey = req.headers["x-idempotency-key"] as string;

  if (!idempotencyKey || !["POST", "PUT", "PATCH"].includes(req.method)) {
    return next();
  }

  const tenantId = (req as any).user?.tenantId || "global";
  const cacheKey = `idempotency:${tenantId}:${req.method}:${req.path}:${idempotencyKey}`;

  const cached = idempotencyCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < DEFAULT_TTL_MS) {
    res.setHeader("X-Cache-Lookup", "HIT");
    res.setHeader("X-Idempotency-Key", idempotencyKey);
    return res.status(cached.statusCode).json(cached.body);
  }

  // Intercept res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyCache.set(cacheKey, {
        statusCode: res.statusCode,
        headers: res.getHeaders() as Record<string, string | string[]>,
        body,
        createdAt: Date.now(),
      });
    }
    return originalJson(body);
  };

  next();
}

/**
 * Helper to clear idempotency cache for testing
 */
export function clearIdempotencyCache() {
  idempotencyCache.clear();
}
