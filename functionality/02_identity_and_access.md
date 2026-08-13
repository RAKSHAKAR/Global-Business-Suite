# 02. Identity & Access Management Documentation

The **Identity & Access Management (IAM)** module handles global user accounts, Role-Based Access Control (RBAC), permission dry-run simulation, and automated multi-step administrative approval workflows.

---

## 📄 Page 1: Global Users (`/users`)

### Overview & Purpose
Comprehensive directory for managing all users across all portals (Admin, Partner, Customer) and tenants.

### Key Features & Functionality
1. **User Directory**:
   - Filterable by Role (`SUPER_ADMIN`, `ADMIN`, `PARTNER`, `USER`), Tenant, and Status (`ACTIVE`, `SUSPENDED`, `PENDING_APPROVAL`).
   - Displays avatar, full name, email, tenant association, assigned role, and MFA status.
2. **User Provisioning**:
   - Create new users manually with tenant assignment and initial role allocation.
   - Force password reset on next login toggle.
3. **MFA & Security Controls**:
   - Reset user MFA/TOTP secrets.
   - Unlock locked accounts due to failed login attempts.
   - Suspend or activate user access instantly.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/users/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/users/page.tsx)
- **API Endpoints**:
  - `GET /api/v1/users`
  - `POST /api/v1/users`
  - `PUT /api/v1/users/:id`
  - `POST /api/v1/users/:id/reset-mfa`

---

## 📄 Page 2: Roles & Permissions (`/roles`)

### Overview & Purpose
Defines granular permission matrices and custom RBAC roles for enterprise governance.

### Key Features & Functionality
1. **System & Custom Roles**:
   - View default system roles (`SUPER_ADMIN`, `TENANT_ADMIN`, `PARTNER_MANAGER`, `CONTENT_CREATOR`, `VIEWER`).
   - Create custom roles tailored to specific client operational requirements.
2. **Granular Permission Matrix**:
   - Checkbox matrix mapping resources (e.g., `tenants`, `billing`, `ai-models`, `social-posts`) to actions (`create`, `read`, `update`, `delete`, `approve`, `export`).
3. **Role Inheritance**: Assign parent roles to automatically inherit base permission sets.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/roles/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/roles/page.tsx)
- **API Endpoints**:
  - `GET /api/v1/roles`
  - `POST /api/v1/roles`
  - `PUT /api/v1/roles/:id`

---

## 📄 Page 3: Permission Simulator (`/role-simulator`)

### Overview & Purpose
A dry-run testing tool that allows administrators to simulate access requests as if they were a specific user or role without switching accounts.

### Key Features & Functionality
1. **Target Selector**: Select any user or custom role to test against.
2. **Resource & Action Test Inputs**: Choose a target route or API endpoint (e.g., `DELETE /api/v1/tenants/123`).
3. **Evaluation Trace**: Displays step-by-step decision trees showing why access is `ALLOWED` or `DENIED` (including tenant boundaries, RBAC rules, and MFA policies).

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/role-simulator/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/role-simulator/page.tsx)
- **API Endpoint**: `POST /api/v1/rbac/simulate`

---

## 📄 Page 4: Approval Workflows (`/approval-workflows`)

### Overview & Purpose
Manages multi-tier authorization chains for sensitive operations (e.g., high-value refunds, custom tenant deletion, bulk role escalation).

### Key Features & Functionality
1. **Workflow Rules Engine**: Configure approval triggers based on entity type and thresholds (e.g., refunds over $1,000 require 2-tier approval).
2. **Pending Approval Queue**: Review, approve, or reject pending requests with audit comments.
3. **Automated Delegation**: Configure out-of-office delegate approvers for seamless continuity.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/approval-workflows/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/approval-workflows/page.tsx)
- **API Endpoints**:
  - `GET /api/v1/approvals`
  - `POST /api/v1/approvals/:id/decide`
