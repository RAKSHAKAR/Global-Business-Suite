# Enterprise Identity & Access Management (IAM) — CAPTCHA Subsystem Technical Documentation

This document describes the design, API specifications, security mechanisms, and database configuration options for the **Enterprise Image & Audio CAPTCHA Subsystem**.

---

## 1. Overview

The Enterprise CAPTCHA system protects all authentication entrypoints across the platform (_Admin Web/Mobile, Partner Web/Mobile, Customer Web/Mobile, and Marketing Portal_) against automated bot attacks, credential stuffing, brute-force scripts, and OCR recognition.

Key Features:

- **Server-Side Generation**: SVG image distortion, noise lines, variable character sets, and font parameters rendered via `svg-captcha`.
- **Audio Accessibility**: Integrated server-synthesized WAV PCM Audio CAPTCHA stream (`GET /api/v1/auth/captcha/audio/:id`) for visually impaired accessibility.
- **Session-Bound Security**: CAPTCHA solution hashes are stored strictly in-memory (`captchaStore`) and are single-use (deleted instantly upon validation attempt or expiration).
- **Database-Driven Configuration**: Managed dynamically via `PlatformSetting` model without restarting backend services.

---

## 2. API Endpoints

### 1. Generate Image CAPTCHA

`GET /api/v1/auth/captcha`

**Response (200 OK):**

```json
{
  "id": "c8a415a7-96a8-4228-a42e-188cb831e50f",
  "image": "<svg xmlns=...></svg>",
  "audioEnabled": true,
  "audioUrl": "/api/v1/auth/captcha/audio/c8a415a7-96a8-4228-a42e-188cb831e50f"
}
```

### 2. Stream Audio CAPTCHA (WAV)

`GET /api/v1/auth/captcha/audio/:id`

**Response Header:** `Content-Type: audio/wav`  
**Response Body:** Binary WAV PCM audio stream containing synthesized character tones + white noise.

### 3. Authenticate / Login (With CAPTCHA Verification)

`POST /api/v1/auth/login`

**Request Body:**

```json
{
  "email": "partner@demo.com",
  "password": "Partner@1234!",
  "captchaId": "c8a415a7-96a8-4228-a42e-188cb831e50f",
  "captchaToken": "x9a7b2"
}
```

---

## 3. Database Configurations (`PlatformSetting`)

| Setting Key                  | Default Value | Description                                               |
| :--------------------------- | :------------ | :-------------------------------------------------------- |
| `CAPTCHA_ENABLED`            | `true`        | Globally toggles CAPTCHA enforcement on or off.           |
| `CAPTCHA_MIN_LENGTH`         | `6`           | Minimum character length for generated CAPTCHAs.          |
| `CAPTCHA_MAX_LENGTH`         | `6`           | Maximum character length for generated CAPTCHAs.          |
| `CAPTCHA_ALLOW_UPPERCASE`    | `true`        | Include `A-Z` in character preset.                        |
| `CAPTCHA_ALLOW_LOWERCASE`    | `true`        | Include `a-z` in character preset.                        |
| `CAPTCHA_ALLOW_NUMBERS`      | `true`        | Include `0-9` in character preset.                        |
| `CAPTCHA_DISTORTION_LEVEL`   | `medium`      | Wave distortion level (`low`, `medium`, `high`).          |
| `CAPTCHA_NOISE_LEVEL`        | `2`           | Frequency of random noise dots and lines.                 |
| `CAPTCHA_EXPIRATION_MINUTES` | `5`           | Time-to-live (TTL) for a CAPTCHA session (default 5 min). |
| `CAPTCHA_MAX_ATTEMPTS`       | `5`           | Max allowed failed attempts before session lockout.       |
| `CAPTCHA_LOCKOUT_MINUTES`    | `15`          | Lockout duration after exceeding max attempts.            |
| `CAPTCHA_AUDIO_ENABLED`      | `true`        | Toggles audio fallback availability.                      |

---

## 4. Security Mechanisms

1. **No Client Solution Leakage**: Plaintext CAPTCHA solutions are never sent to the browser.
2. **Single-Use Verification**: Successful or failed validation attempts consume the token instantly to prevent Replay Attacks.
3. **Attempt & Lockout Limits**: Exceeding `CAPTCHA_MAX_ATTEMPTS` locks the session for 15 minutes to defeat automated brute-force attempts.
4. **OCR Resistance**: High contrast noise lines, random rotation, and wave distortion defeat basic optical character recognition models.
