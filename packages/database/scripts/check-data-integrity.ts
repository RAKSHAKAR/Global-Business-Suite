/// <reference types="node" />
declare const require: any;
declare const module: any;
declare const process: any;

import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

export interface IntegrityCheckReport {
  timestamp: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  details: {
    checkName: string;
    status: "PASS" | "FAIL";
    count: number;
    description: string;
  }[];
}

/**
 * Enterprise Database Integrity & Isolation Scanner
 */
export async function runDataIntegrityCheck(): Promise<IntegrityCheckReport> {
  const details: IntegrityCheckReport["details"] = [];

  // Check 1: Orphan Users (Users with non-existent tenantId)
  const users = await prisma.user.findMany({ select: { id: true, tenantId: true } });
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  const validTenantIds = new Set(tenants.map((t) => t.id));

  const orphanUsers = users.filter((u) => u.tenantId && !validTenantIds.has(u.tenantId));
  details.push({
    checkName: "Orphan Users Check",
    status: orphanUsers.length === 0 ? "PASS" : "FAIL",
    count: orphanUsers.length,
    description: orphanUsers.length === 0 ? "No orphan user records found." : `Found ${orphanUsers.length} users with invalid tenant IDs.`,
  });

  // Check 2: Orphan Social Posts
  const socialPosts = await prisma.socialPost.findMany({ select: { id: true, tenantId: true } });
  const orphanPosts = socialPosts.filter((p) => !validTenantIds.has(p.tenantId));
  details.push({
    checkName: "Orphan Social Posts Check",
    status: orphanPosts.length === 0 ? "PASS" : "FAIL",
    count: orphanPosts.length,
    description: orphanPosts.length === 0 ? "All social posts linked to valid tenants." : `Found ${orphanPosts.length} posts with invalid tenant IDs.`,
  });

  // Check 3: Orphan Customer Orders
  const orders = await prisma.customerOrder.findMany({ select: { id: true, tenantId: true } });
  const orphanOrders = orders.filter((o) => !validTenantIds.has(o.tenantId));
  details.push({
    checkName: "Orphan Customer Orders Check",
    status: orphanOrders.length === 0 ? "PASS" : "FAIL",
    count: orphanOrders.length,
    description: orphanOrders.length === 0 ? "All customer orders linked to valid tenants." : `Found ${orphanOrders.length} orders with invalid tenant IDs.`,
  });

  // Check 4: Soft-Deleted Tenant Isolation (Users under deleted tenants should be soft-deleted or inactive)
  const deletedTenants = await prisma.tenant.findMany({ where: { isDeleted: true }, select: { id: true } });
  const deletedTenantIds = new Set(deletedTenants.map((t) => t.id));
  const activeUsersUnderDeletedTenant = users.filter((u) => u.tenantId && deletedTenantIds.has(u.tenantId));

  details.push({
    checkName: "Soft-Deleted Tenant Scoping Check",
    status: activeUsersUnderDeletedTenant.length === 0 ? "PASS" : "FAIL",
    count: activeUsersUnderDeletedTenant.length,
    description: activeUsersUnderDeletedTenant.length === 0 ? "No active users found under soft-deleted tenants." : `Found ${activeUsersUnderDeletedTenant.length} users under soft-deleted tenants.`,
  });

  // Check 5: Master Lookup Integrity (Countries and Currencies present)
  const countryCount = await prisma.country.count();
  const currencyCount = await prisma.currency.count();

  details.push({
    checkName: "Master Lookup Seeding Check",
    status: countryCount > 0 && currencyCount > 0 ? "PASS" : "FAIL",
    count: countryCount + currencyCount,
    description: `Master lookup tables verified (${countryCount} countries, ${currencyCount} currencies).`,
  });

  const passed = details.filter((d) => d.status === "PASS").length;
  const failed = details.filter((d) => d.status === "FAIL").length;

  return {
    timestamp: new Date().toISOString(),
    totalChecks: details.length,
    passedChecks: passed,
    failedChecks: failed,
    details,
  };
}

async function main() {
  console.log("Executing Database Integrity Scanner...");
  const report = await runDataIntegrityCheck();
  console.log("Data Integrity Scanner Report:");
  console.dir(report, { depth: null });
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Integrity Scanner Error:", err);
    process.exit(1);
  });
}
