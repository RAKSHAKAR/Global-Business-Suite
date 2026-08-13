# Customer Google SSO & Subscription Feature Gating Technical Documentation

This document describes the design, API specifications, security mechanisms, and subscription plan feature gating for the **Customer Authentication & Feature Gating System**.

---

## 1. Customer Authentication Architecture

To enforce zero-trust security across customer accounts:

- **Mandatory Google Sign-In (OAuth2 / OIDC)**: Password logins for customers can be disabled in favor of Google Workspace / Gmail OAuth2.
- **Server-Side CAPTCHA Validation**: Google OAuth login requests require a valid, non-expired server CAPTCHA session token before processing token exchanges or account provisioning.
- **Automatic Account Provisioning**: First-time Google logins automatically provision a `User` record linked to a `ProviderAccount` with default tenant context.

---

## 2. API Endpoint Specification

### `POST /api/v1/auth/google-login`

**Request Body:**

```json
{
  "email": "customer@demo.com",
  "firstName": "Customer",
  "lastName": "User",
  "googleId": "google-oauth-123456789",
  "captchaId": "c8a415a7-96a8-4228-a42e-188cb831e50f",
  "captchaToken": "x9a7b2"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "50887097-0459-4095-9b5f-e9acd934a0b7",
    "email": "customer@demo.com",
    "firstName": "Customer",
    "lastName": "User",
    "tenantId": "e6e65cda-9abe-4ae9-b98e-64af45245df5",
    "provider": "google"
  }
}
```

---

## 3. Subscription Feature Gating Middleware

The `requirePlanFeature(featureKey)` middleware enforces subscription-based feature restrictions across backend routes:

- Reads the user's `tenantId` from the JWT payload.
- Queries `prisma.subscription` and `prisma.plan` for the tenant.
- Evaluates `plan.allowedModels` (e.g. `['gemini-1.5-pro', 'social-scheduler']`).
- If the feature is locked under the current plan, returns a `403 Forbidden` response with an upgrade prompt payload:

```json
{
  "error": "Feature locked under current subscription plan",
  "upgradeRequired": true,
  "currentPlan": "Starter",
  "requiredFeature": "gpt-4o",
  "message": "The feature 'gpt-4o' is not included in your Starter plan. Please upgrade to unlock."
}
```
