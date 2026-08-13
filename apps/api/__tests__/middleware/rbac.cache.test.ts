/**
 * GBS Enterprise — RBAC Permission Cache Test Suite
 *
 * Tests:
 * - H-04: Permission cache hit/miss behavior
 * - Cache invalidation on role changes
 * - Super admin bypass
 * - Suspended user governance
 * - Permission set compilation
 */

import { permissionCache } from "../../src/services/permissionCacheService";

jest.mock("@saas/database", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const { prisma } = require("@saas/database");

describe("H-04: RBAC Permission Cache Service", () => {
  beforeEach(async () => {
    // Clear in-memory cache between tests
    await permissionCache.invalidate("test-user-1");
    await permissionCache.invalidate("super-admin-1");
    await permissionCache.invalidate("suspended-user-1");
    jest.clearAllMocks();
  });

  test("should load permissions from DB on cache miss and cache them", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "test-user-1",
      approvalStatus: "APPROVED",
      isSuspended: false,
      roles: [
        {
          role: {
            name: "Content Manager",
            isSystem: false,
            permissions: [
              {
                permission: { resource: "social_posts", action: "create" },
              },
              {
                permission: { resource: "social_posts", action: "read" },
              },
            ],
          },
        },
      ],
    });

    const result = await permissionCache.getOrLoad("test-user-1");

    expect(result).not.toBeNull();
    expect(result!.isSuperAdmin).toBe(false);
    expect(result!.isSuspended).toBe(false);
    expect(result!.permissionSet.has("social_posts:create")).toBe(true);
    expect(result!.permissionSet.has("social_posts:read")).toBe(true);
    expect(result!.permissionSet.has("billing:manage")).toBe(false);

    // DB should have been called once
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  test("should serve subsequent requests from cache (no extra DB queries)", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "test-user-1",
      approvalStatus: "APPROVED",
      isSuspended: false,
      roles: [
        {
          role: {
            name: "Viewer",
            isSystem: false,
            permissions: [
              { permission: { resource: "analytics", action: "read" } },
            ],
          },
        },
      ],
    });

    // First call — DB hit
    await permissionCache.getOrLoad("test-user-1");
    // Second call — should be cache hit
    const cached = await permissionCache.getOrLoad("test-user-1");

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1); // Only one DB query
    expect(cached!.permissionSet.has("analytics:read")).toBe(true);
  });

  test("should return null for non-existent user", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    const result = await permissionCache.getOrLoad("nonexistent-user");
    expect(result).toBeNull();
  });

  test("should detect Super Admin and set isSuperAdmin=true", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "super-admin-1",
      approvalStatus: "APPROVED",
      isSuspended: false,
      roles: [
        {
          role: {
            name: "Super Admin",
            isSystem: true,
            permissions: [],
          },
        },
      ],
    });

    const result = await permissionCache.getOrLoad("super-admin-1");

    expect(result!.isSuperAdmin).toBe(true);
    // Super admins don't need explicit permissions — middleware grants all access
  });

  test("should detect suspended user and set isSuspended=true", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "suspended-user-1",
      approvalStatus: "SUSPENDED",
      isSuspended: true,
      roles: [
        {
          role: {
            name: "Customer",
            isSystem: false,
            permissions: [
              { permission: { resource: "billing", action: "read" } },
            ],
          },
        },
      ],
    });

    const result = await permissionCache.getOrLoad("suspended-user-1");

    expect(result!.isSuspended).toBe(true);
    // Suspended users still get their permission set loaded (middleware enforces restrictions)
    expect(result!.permissionSet.has("billing:read")).toBe(true);
  });

  test("should invalidate cache entry and re-query DB on next access", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: "test-user-1",
        approvalStatus: "APPROVED",
        isSuspended: false,
        roles: [
          {
            role: {
              name: "Viewer",
              isSystem: false,
              permissions: [
                { permission: { resource: "analytics", action: "read" } },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        id: "test-user-1",
        approvalStatus: "APPROVED",
        isSuspended: false,
        roles: [
          {
            role: {
              name: "Manager",
              isSystem: false,
              permissions: [
                { permission: { resource: "analytics", action: "read" } },
                { permission: { resource: "social_posts", action: "create" } },
              ],
            },
          },
        ],
      });

    // Initial load
    const v1 = await permissionCache.getOrLoad("test-user-1");
    expect(v1!.permissionSet.has("social_posts:create")).toBe(false);

    // Invalidate (simulating role change)
    await permissionCache.invalidate("test-user-1");

    // Re-load after invalidation — should have new permissions
    const v2 = await permissionCache.getOrLoad("test-user-1");
    expect(v2!.permissionSet.has("social_posts:create")).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
  });

  test("should handle manage permission as wildcard for action", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: "test-user-1",
      approvalStatus: "APPROVED",
      isSuspended: false,
      roles: [
        {
          role: {
            name: "Admin",
            isSystem: false,
            permissions: [
              { permission: { resource: "social_posts", action: "manage" } },
            ],
          },
        },
      ],
    });

    const result = await permissionCache.getOrLoad("test-user-1");

    // manage permission is stored as social_posts:manage
    expect(result!.permissionSet.has("social_posts:manage")).toBe(true);
    // The RBAC middleware checks for resource:manage as a wildcard
  });
});
