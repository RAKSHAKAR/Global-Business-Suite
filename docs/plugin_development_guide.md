# Global Business Suite (GBS) — Plugin Development Guide

## Architecture & Security Isolation

Plugins in GBS run inside an isolated, permission-scoped sandbox policy:
- **Tenant Isolation**: Plugins are scoped strictly to the installing tenant's boundaries.
- **RBAC Enforcement**: Required permissions (`crm.manage`, `integrations.read`) must be declared in `permissionsJson`.
- **Memory & Execution Limits**: Micro-sandboxing limits memory allocation (e.g. 256MB) and network egress based on tenant policies.

## Plugin Lifecycle

1. **Development & Manifest**:
   Create a manifest declaring `name`, `slug`, `version`, `permissions`, and `priceType`.
2. **Publishing**:
   Plugins can be published as **Public Marketplace Items** or **Private Tenant-Scoped Extensions**.
3. **Installation & Licensing**:
   Tenants install plugins via `/api/v1/ecosystem/plugins/install`. Licensing options include Free, One-Time Paid, Monthly Subscription, or Freemium.
4. **Ratings & Reviews**:
   Users can submit 1-5 star ratings and reviews via `/api/v1/ecosystem/plugins/reviews`.
