import { Request, Response, NextFunction } from "express";
import { AppError, sendError } from "../utils/responseHandler";

/**
 * Enterprise Global Error Handling Middleware
 * Catches unhandled errors, Prisma exceptions, and custom AppErrors.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const requestId = (req as any).requestId || (req as any).id;
  console.error(`[UNHANDLED ERROR] [RequestID: ${requestId || "N/A"}]`, err);

  if (err instanceof AppError) {
    return sendError(
      res,
      err.message,
      err.statusCode,
      err.errorCode || "APP_ERROR",
      err.details,
    );
  }

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === "P2002") {
    const targets = err.meta?.target ? String(err.meta.target) : "field";
    return sendError(
      res,
      `A record with this ${targets} already exists.`,
      409,
      "DUPLICATE_ENTRY",
    );
  }

  // Handle Prisma record not found (P2025)
  if (err.code === "P2025") {
    return sendError(res, "Resource not found", 404, "NOT_FOUND");
  }

  // Generic 500 internal server error
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";

  return sendError(res, message, 500, "INTERNAL_SERVER_ERROR");
}
