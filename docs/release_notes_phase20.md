# Release Notes – Phase 20: Enterprise Registration, Approval, Subscription & Access Management

## Overview

Phase 20 delivers an enterprise-grade Registration, Approval, Subscription, and Access Management Framework across all 4 GBS portals (Admin, Partner, Customer, Web) and 3 cross-platform mobile apps (Admin Mobile, Partner Mobile, Customer Mobile).

---

## Key Achievements & Feature Matrix

### 1. Registration Rules & Portal Guardrails
- **Admin Public Registration Ban**: Public self-registration for `ADMIN` roles is strictly blocked (403 Forbidden). Admin accounts are created solely by Super Admins.
- **Partner Multi-Step Onboarding**: Mandatory Admin approval workflow (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`, `BLOCKED`, `ARCHIVED`). Support for business verification document uploads.
- **Customer Instant Registration**: Immediate account creation with Mobile/WhatsApp OTP verification and default subscription plan assignment.

### 2. Subscription Engine & View vs Action Permissions
- **Granular Action Matrix**: Action-level permission checks (`view`, `create`, `edit`, `delete`, `approve`, `export`, `import`, `share`, `ai`, `api`).
- **Feature Locking UI Contract**: Restricted features display "Upgrade Required" banners and one-click upgrade triggers rather than being hidden.
- **Subscription Limit Counters**: Comprehensive limit tracking across Partner limits (customers, employees, orgs, GBP accounts/profiles, social accounts, storage, AI token usage, communications) and Customer limits.

### 3. Upgrade Requests & Immediate Feature Activation
- **Automated Upgrade Flow**: Customer/Partner upgrade requests with admin approval console.
- **Instant Plan Activation**: Immediate subscription plan switching and feature unlocking upon payment transaction verification.

---

## Database Schema Enhancements (`packages/database`)

- `User`: Added `approvalStatus` (`PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`, `BLOCKED`, `ARCHIVED`).
- `Plan`: Added 18 explicit limit fields (`maxCustomers`, `maxEmployees`, `maxLocations`, etc.) and `allowedActionsJson`.
- `RegistrationConfig`: New table for portal-specific registration & verification settings.
- `PartnerVerificationDocument`: New table for partner business document uploads.
- `UpgradeRequest`: New table tracking upgrade submissions, payment transaction IDs, and admin approval notes.

---

## API Endpoints Added (`apps/api`)

- `GET/PUT /api/v1/admin/registration-config`: Portal registration & verification rules management.
- `GET /api/v1/admin/partner-approvals`: Partner application approval queue.
- `POST /api/v1/admin/partner-approvals/:id/review`: Partner status review (Approve, Reject, Suspend, Block, Archive).
- `POST /api/v1/partners/upload-documents`: Partner business document upload endpoint.
- `POST /api/v1/access/evaluate`: Granular View vs Action & feature locking evaluation engine.
- `GET /api/v1/access/my-subscription-limits`: Active subscription limits endpoint.
- `POST /api/v1/upgrades/request`: Upgrade request submission endpoint.
- `GET /api/v1/admin/upgrades`: Pending upgrade requests queue.
- `POST /api/v1/admin/upgrades/:id/approve`: Admin upgrade approval & immediate plan activation.
- `POST /api/v1/admin/upgrades/:id/reject`: Admin upgrade rejection.

---

## Verification & Automated Test Suite

- **Test Suite**: `apps/api/src/__tests__/registrationApproval.test.ts`
- **Result**: 13/13 Automated Tests Passed (100% Pass Rate).
