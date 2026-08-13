# Lead Capture & Integration Architecture Technical Documentation

This document describes the design, APIs, database integration, and WhatsApp video follow-up integration for the **Automated Marketing Lead System**.

---

## 1. Overview

The Marketing Portal (`apps/web-portal` on port `3003`) and Marketing landing pages capture prospect leads for demo requests, pricing inquiries, newsletter subscriptions, and WhatsApp video calls.

All leads are:

1. Validated via **Server-Side CAPTCHA (Image or WAV Audio)** to prevent form spam.
2. Ingested via `POST /api/v1/leads`.
3. Created as `Client` records with status `LEAD`.
4. Logged in real-time in `AuditLog` (`action: "LEAD_CAPTURED"`).
5. Displayed in the Super Admin & Sales Dashboard (`/leads`) and Admin Mobile app for immediate sales follow-up.

---

## 2. API Specifications

### `POST /api/v1/leads` (Public Endpoint with CAPTCHA)

**Request Body:**

```json
{
  "firstName": "Sarah",
  "lastName": "Conner",
  "email": "sarah@cyberdyne.com",
  "phone": "+919876543210",
  "companyName": "Cyberdyne Systems",
  "notes": "Interested in Enterprise Plan demo & WhatsApp Video Call",
  "whatsappVideoRequested": true,
  "captchaId": "c8a415a7-96a8-4228-a42e-188cb831e50f",
  "captchaToken": "x9a7b2"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Thank you! Your lead request has been registered. Our sales team will reach out shortly.",
  "leadId": "client-uuid-12345"
}
```

### `GET /api/v1/leads` (Admin Endpoint)

Returns paginated leads with contact information, status, and direct WhatsApp video follow-up action triggers.

---

## 3. WhatsApp Video Call Integration

In the Admin Portal & Mobile apps:

- Each lead entry features a **💬 WhatsApp Video Follow-Up** trigger.
- Clicking the action dynamically opens `https://wa.me/<phone>?text=Hello%20<name>!...` allowing sales representatives to initiate video meetings and sales conversations directly.
