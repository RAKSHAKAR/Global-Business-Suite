# Advanced RBAC & Centralized Audit Logging Technical Documentation

This document describes the design, API specifications, and architecture of the **Dynamic Role-Based Access Control (RBAC)** and **Centralized Audit Logging Subsystem**.

---

## 1. Role-Based Access Control (RBAC) Engine

The RBAC engine enforces fine-grained permission control across API endpoints:

- **Permission Format**: Standardized as `resource:action` (e.g., `users:manage`, `roles:create`, `billing:read`, `posts:publish`).
- **Super Admin Bypass**: Roles designated as `isSystem: true` or named `"Super Admin"` automatically bypass permission guards for complete platform administration.
- **Tenant Scope**: Roles can be global (system-wide) or scoped to a specific tenant (`tenantId`).

### Middleware Usage

```typescript
import { requirePermission } from "../middleware/rbac";

// Protect route with RBAC Guard
router.post(
  "/roles",
  authMiddleware,
  requirePermission("roles", "create"),
  createRoleHandler,
);
```

---

## 2. Dynamic Roles & Permissions APIs

### `GET /api/v1/roles`

Lists all roles with assigned permissions and assigned user counts.

### `GET /api/v1/roles/permissions`

Lists all registered permissions in the platform catalog.

### `POST /api/v1/roles`

Creates a custom role with assigned permission IDs:

```json
{
  "name": "Marketing Analyst",
  "description": "Can view analytics and social posts",
  "permissionIds": ["perm-id-1", "perm-id-2"]
}
```

### `PUT /api/v1/roles/:id`

Updates permissions assigned to a custom role. System roles (`isSystem: true`) cannot be modified.

### `DELETE /api/v1/roles/:id`

Deletes a custom role. System roles cannot be deleted.

---

## 3. Centralized Audit Logging APIs

### `GET /api/v1/audit-logs`

Search and filter audit logs across applications and APIs.

**Query Parameters:**

- `page`: Page number (default: `1`)
- `limit`: Logs per page (default: `50`)
- `action`: Filter by event action (e.g., `USER_LOGIN`, `ROLE_CREATED`, `LEAD_CAPTURED`)
- `userId`: Filter by user ID
- `tenantId`: Filter by tenant ID

### `GET /api/v1/audit-logs/export`

Exports audit log records directly to a downloadable CSV spreadsheet (`audit_logs.csv`).

**Header Format:**

```csv
ID,Timestamp,TenantID,UserID,Action,Resource,ResourceID,IPAddress,UserAgent
```
