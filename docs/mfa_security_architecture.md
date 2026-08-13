# Multi-Factor Authentication (MFA / 2FA) Technical Documentation

This document details the architecture, TOTP key generation, QR code setup, verification algorithms, and backup recovery codes for the **Multi-Factor Authentication Subsystem**.

---

## 1. Overview

The Multi-Factor Authentication (MFA) engine enforces Time-based One-Time Password (TOTP) validation per RFC 6238.

Supported Authenticator Apps:

- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password / Bitwarden

---

## 2. Technical Specifications

- **Algorithm**: HMAC-SHA1
- **Passcode Length**: 6 Digits
- **Time Step**: 30 Seconds
- **Skew Tolerance Window**: ±1 Time Step (±30s)
- **Base32 Secret**: Random secret encoded as 32 Base32 characters.
- **Backup Recovery Codes**: 8 single-use hex tokens formatted as `XXXX-XXXX`.

---

## 3. API Workflow (`/api/v1/auth/mfa`)

### `POST /api/v1/auth/mfa/setup` (Authenticated)

Generates secret, `otpauth://` URI, and 8 recovery codes.

### `POST /api/v1/auth/mfa/verify` (Authenticated)

Validates the user's initial 6-digit TOTP code to confirm authenticator setup and enables MFA (`twoFactorSecret` saved on `User`).

### `POST /api/v1/auth/mfa/validate` (Public / Login Challenge Flow)

Validates the 6-digit TOTP passcode during login challenges.
