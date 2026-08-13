/**
 * GBS Enterprise — Centralized JWT Configuration
 *
 * Single source of truth for JWT secret resolution.
 * Imported by auth middleware and all authentication routes.
 *
 * SECURITY: Never duplicate this logic in individual route files.
 * This module validates presence of JWT_SECRET at load time
 * in non-test environments, preventing silent fallback to a
 * known-public default string.
 */

export interface JwtPayload {
  userId: string;
  /** Alias for userId — some routes use req.user.id (backward compat) */
  id?: string;
  email: string;
  tenantId?: string | null;
  approvalStatus?: string;
  isSuspended?: boolean;
  subscriptionStatus?: string;
  provider?: string;
  loginType?: string;
  channel?: string;
  /** Roles array — populated by some session payloads */
  roles?: Array<{ role: { name: string; isSystem?: boolean; permissions?: any[] } }>;
  iat?: number;
  exp?: number;
}

const DEV_FALLBACK = "dev-only-secret-replace-in-production-immediately";

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[FATAL] JWT_SECRET environment variable is not set. " +
          "This is a critical security requirement. " +
          "Set JWT_SECRET in your environment configuration before starting the server.",
      );
    }
    // In development/test, warn but use fallback
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[SECURITY WARNING] JWT_SECRET is not set. " +
          "Using insecure development fallback. " +
          "This MUST be replaced in production.",
      );
    }
    return DEV_FALLBACK;
  }

  // Enforce minimum secret strength
  if (secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[FATAL] JWT_SECRET must be at least 32 characters for production security. " +
          "Generate a strong secret with: openssl rand -base64 48",
      );
    }
    console.warn(
      "[SECURITY WARNING] JWT_SECRET is shorter than recommended 32 characters.",
    );
  }

  return secret;
}

/** Resolved JWT secret — guaranteed single evaluation at module load. */
export const JWT_SECRET = resolveJwtSecret();

/** JWT token expiry — configurable via environment variable. */
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || "24h";

/** JWT refresh token expiry. */
export const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Returns SignOptions with expiresIn cast appropriately.
 * Use this instead of inline { expiresIn: JWT_EXPIRES_IN } to avoid
 * TypeScript StringValue brand type errors with jsonwebtoken v9+.
 */
export function getSignOptions(expiresIn?: string) {
  return { expiresIn: (expiresIn || JWT_EXPIRES_IN) as any };
}
