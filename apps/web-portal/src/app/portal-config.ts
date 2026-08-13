export type PortalId = "admin" | "partner" | "customer" | "web";

export const portalUrls = {
  admin: process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL || "http://localhost:3000",
  partner: process.env.NEXT_PUBLIC_PARTNER_PORTAL_URL || "http://localhost:3001",
  customer: process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "http://localhost:3002",
  web: process.env.NEXT_PUBLIC_WEB_PORTAL_URL || "http://localhost:3003",
} satisfies Record<PortalId, string>;

export function portalUrl(portal: PortalId, path = "") {
  const baseUrl = portalUrls[portal].replace(/\/$/, "");
  if (!path) return baseUrl;
  return `${baseUrl}/${path.replace(/^\//, "")}`;
}

