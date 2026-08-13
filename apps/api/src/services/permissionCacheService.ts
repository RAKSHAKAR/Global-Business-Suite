/**
 * GBS Enterprise — Redis-Backed Permission Cache Service
 *
 * Provides a Redis-cached layer over RBAC permission lookups.
 * Eliminates the N+1 DB query pattern in the RBAC middleware by
 * caching compiled permission sets per user with automatic
 * invalidation on role changes.
 *
 * PERFORMANCE FIX (H-04): Reduces RBAC overhead from O(n_endpoints)
 * DB queries to a single Redis GET with O(1) cache hits.
 *
 * TTL: 5 minutes (configurable via RBAC_CACHE_TTL_SECONDS env var)
 */

import { prisma } from "@saas/database";
import { logger } from "../utils/logger";

const CACHE_TTL_SECONDS = parseInt(
  process.env.RBAC_CACHE_TTL_SECONDS || "300",
  10,
);
const CACHE_KEY_PREFIX = "rbac:perms:";

/** Compiled permission set for a user. */
export interface CompiledPermissions {
  userId: string;
  isSuperAdmin: boolean;
  isSuspended: boolean;
  permissionSet: Set<string>; // "resource:action" pairs
  cachedAt: number;
}

/**
 * In-process permission cache (Redis replacement for single-instance dev).
 * In production with Redis available, replace this with ioredis GET/SET.
 *
 * PRODUCTION NOTE: If Redis is available (REDIS_URL env set), this service
 * automatically switches to Redis-backed caching for multi-instance safety.
 */
class PermissionCacheService {
  private inMemoryCache = new Map<
    string,
    { data: CompiledPermissions; expiresAt: number }
  >();
  private redisClient: any = null;
  private redisAvailable = false;

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    if (!process.env.REDIS_URL) {
      logger.info(
        "[PermissionCache] Redis not configured. Using in-process cache (single instance only).",
        { service: "permission-cache" },
      );
      return;
    }

    try {
      const { default: Redis } = await import("ioredis");
      this.redisClient = new Redis(process.env.REDIS_URL, {
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
      });

      this.redisClient.on("connect", () => {
        this.redisAvailable = true;
        logger.info("[PermissionCache] Redis connected — using distributed cache.", {
          service: "permission-cache",
        });
      });

      this.redisClient.on("error", (err: Error) => {
        this.redisAvailable = false;
        logger.warn("[PermissionCache] Redis error — falling back to in-process cache.", {
          service: "permission-cache",
          error: err.message,
        });
      });

      await this.redisClient.connect();
    } catch (err: any) {
      logger.warn(
        "[PermissionCache] Redis initialization failed — using in-process cache.",
        { service: "permission-cache", error: err.message },
      );
    }
  }

  private getCacheKey(userId: string): string {
    return `${CACHE_KEY_PREFIX}${userId}`;
  }

  /** Retrieve cached permissions for a user, if valid. */
  async get(userId: string): Promise<CompiledPermissions | null> {
    const key = this.getCacheKey(userId);

    if (this.redisAvailable && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Re-hydrate Set from array
        parsed.permissionSet = new Set<string>(parsed.permissionSet || []);
        return parsed as CompiledPermissions;
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const cached = this.inMemoryCache.get(key);
    if (!cached || Date.now() > cached.expiresAt) {
      this.inMemoryCache.delete(key);
      return null;
    }
    return cached.data;
  }

  /** Store compiled permissions for a user. */
  async set(userId: string, permissions: CompiledPermissions): Promise<void> {
    const key = this.getCacheKey(userId);
    const expiresAt = Date.now() + CACHE_TTL_SECONDS * 1000;

    if (this.redisAvailable && this.redisClient) {
      try {
        // Serialize Set to array for JSON storage
        const serializable = {
          ...permissions,
          permissionSet: Array.from(permissions.permissionSet),
        };
        await this.redisClient.setex(key, CACHE_TTL_SECONDS, JSON.stringify(serializable));
        return;
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    this.inMemoryCache.set(key, { data: permissions, expiresAt });
  }

  /**
   * Invalidate cached permissions for a specific user.
   * Call this when a user's roles are changed.
   */
  async invalidate(userId: string): Promise<void> {
    const key = this.getCacheKey(userId);

    if (this.redisAvailable && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        // non-blocking
      }
    }

    this.inMemoryCache.delete(key);
    logger.info("[PermissionCache] Invalidated cache", { userId, service: "permission-cache" });
  }

  /**
   * Load and compile permissions for a user from the database,
   * then store them in cache and return.
   */
  async loadAndCache(userId: string): Promise<CompiledPermissions | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const isSuperAdmin = user.roles.some(
      (r: any) => r.role.name === "Super Admin" || r.role.isSystem,
    );

    const permissionSet = new Set<string>();
    user.roles.forEach((r: any) => {
      r.role.permissions.forEach((p: any) => {
        permissionSet.add(`${p.permission.resource}:${p.permission.action}`);
      });
    });

    const compiled: CompiledPermissions = {
      userId,
      isSuperAdmin,
      isSuspended: (user as any).isSuspended || user.approvalStatus === "SUSPENDED",
      permissionSet,
      cachedAt: Date.now(),
    };

    await this.set(userId, compiled);
    return compiled;
  }

  /**
   * Get permissions from cache or load from DB if not cached.
   * This is the primary entry point for RBAC middleware.
   */
  async getOrLoad(userId: string): Promise<CompiledPermissions | null> {
    const cached = await this.get(userId);
    if (cached) return cached;
    return this.loadAndCache(userId);
  }
}

/** Singleton permission cache instance. */
export const permissionCache = new PermissionCacheService();
