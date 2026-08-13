import os from "node:os";
import path from "node:path";

export const ADMIN_URL = process.env.GBS_ADMIN_URL || "http://localhost:3000";
export const PARTNER_URL = process.env.GBS_PARTNER_URL || "http://localhost:3001";
export const CUSTOMER_URL = process.env.GBS_CUSTOMER_URL || "http://localhost:3002";
export const WEB_URL = process.env.GBS_WEB_URL || "http://localhost:3003";
export const API_URL = process.env.GBS_API_URL || "http://localhost:4000";
export const ADMIN_MOBILE_URL = process.env.GBS_ADMIN_MOBILE_URL || "http://localhost:8081";
export const PARTNER_MOBILE_URL = process.env.GBS_PARTNER_MOBILE_URL || "http://localhost:8082";
export const CUSTOMER_MOBILE_URL = process.env.GBS_CUSTOMER_MOBILE_URL || "http://localhost:8083";

export const ADMIN_AUTH_STATE = path.join(
  os.tmpdir(),
  "gbs-admin-auth-state.json",
);

export const credentials = {
  admin: {
    email: process.env.GBS_E2E_ADMIN_EMAIL || "admin@enterprise.com",
    password: process.env.GBS_E2E_ADMIN_PASSWORD || "Admin@1234!",
  },
  partner: {
    email: process.env.GBS_E2E_PARTNER_EMAIL || "partner@demo.com",
    password: process.env.GBS_E2E_PARTNER_PASSWORD || "Partner@1234!",
  },
  customer: {
    email: process.env.GBS_E2E_CUSTOMER_EMAIL || "customer@demo.com",
    password: process.env.GBS_E2E_CUSTOMER_PASSWORD || "Customer@1234!",
  },
} as const;
