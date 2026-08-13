import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JwtPayload } from "../config/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Enterprise JWT Authentication Middleware.
 *
 * Validates the Bearer token from the Authorization header.
 * Attaches the decoded, typed JwtPayload to req.user.
 *
 * SECURITY: JWT_SECRET is resolved from centralized config (config/jwt.ts)
 * which enforces production validation and prevents fallback to weak defaults.
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      code: "MISSING_TOKEN",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as AuthRequest).user = decoded;
    next();
  } catch (err: any) {
    const isExpired = err?.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      error: isExpired ? "Session expired. Please log in again." : "Invalid authentication token.",
      code: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
    });
  }
};
