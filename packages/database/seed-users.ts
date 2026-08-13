/// <reference types="node" />
/**
 * Enterprise SaaS Platform — Seed Script
 *
 * Creates default admin user, a sample tenant, partner user,
 * permissions, roles, and platform settings.
 *
 * Run: node seed-users.js
 * Or:  npx ts-node seed-users.ts
 */

import { PrismaClient } from "./generated/client";
// @ts-ignore
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding database...\n");

  // ── Permissions ──────────────────────────────────────────────────────────────
  const permissionDefs = [
    { resource: "users", action: "manage" },
    { resource: "tenants", action: "manage" },
    { resource: "billing", action: "manage" },
    { resource: "roles", action: "manage" },
    { resource: "settings", action: "manage" },
    { resource: "ai", action: "manage" },
    { resource: "support", action: "manage" },
    { resource: "social", action: "create" },
    { resource: "social", action: "read" },
    { resource: "social", action: "approve" },
    { resource: "social", action: "publish" },
    { resource: "clients", action: "manage" },
    { resource: "crm", action: "manage" },
    { resource: "leads", action: "manage" },
    { resource: "marketing", action: "manage" },
    { resource: "customer_success", action: "manage" },
    { resource: "documents", action: "manage" },
  ];

  const permissions: Record<string, string> = {};
  for (const p of permissionDefs) {
    const perm = await prisma.permission.upsert({
      where: { resource_action: { resource: p.resource, action: p.action } },
      update: {},
      create: {
        resource: p.resource,
        action: p.action,
        description: `${p.action} ${p.resource}`,
      },
    });
    permissions[`${p.resource}:${p.action}`] = perm.id;
    console.log(`  ✓ Permission: ${p.resource}:${p.action}`);
  }

  // ── Super Admin Role (global) ─────────────────────────────────────────────────
  let superAdminRole = await prisma.role.findFirst({
    where: { name: "Super Admin", tenantId: null },
  });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: "Super Admin",
        description: "Full platform access",
        isSystem: true,
        tenantId: null,
      },
    });
  }
  console.log(`\n  ✓ Role: Super Admin (id: ${superAdminRole.id})`);

  // Assign all permissions to super admin
  for (const permId of Object.values(permissions)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permId,
        },
      },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: permId },
    });
  }
  console.log(`  ✓ All permissions assigned to Super Admin`);

  // ── Admin User ────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@1234!", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@enterprise.com" },
    update: { passwordHash: adminPassword, isActive: true },
    create: {
      email: "admin@enterprise.com",
      passwordHash: adminPassword,
      firstName: "Platform",
      lastName: "Admin",
      isActive: true,
    },
  });
  console.log(
    `\n  ✓ Admin user: admin@enterprise.com  (password: Admin@1234!)`,
  );

  // Assign Super Admin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id },
    },
    update: {},
    create: { userId: adminUser.id, roleId: superAdminRole.id },
  });
  console.log(`  ✓ Super Admin role assigned`);

  // ── Sample Tenant ───────────────────────────────────────────────
  let tenant = await prisma.tenant.findFirst({
    where: { OR: [{ subdomain: "demo" }, { domain: "demo.platform.local" }] },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Demo Company",
        domain: "demo.platform.local",
        subdomain: "demo",
        primaryColor: "#D4AF37",
        isActive: true,
      },
    });
  }
  console.log(`\n  ✓ Tenant: Demo Company (id: ${tenant.id})`);

  // ── Partner Role (tenant-scoped) ──────────────────────────────────────────────
  let partnerRole = await prisma.role.findFirst({
    where: { name: "Partner", tenantId: tenant.id },
  });
  if (!partnerRole) {
    partnerRole = await prisma.role.create({
      data: {
        name: "Partner",
        description: "Partner access within tenant",
        isSystem: false,
        tenantId: tenant.id,
      },
    });
  }

  // Assign partner permissions
  const partnerPerms = [
    "social:create",
    "social:read",
    "social:approve",
    "social:publish",
    "clients:manage",
    "support:manage",
  ];
  for (const key of partnerPerms) {
    const permId = permissions[key];
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: partnerRole.id, permissionId: permId },
        },
        update: {},
        create: { roleId: partnerRole.id, permissionId: permId },
      });
    }
  }
  console.log(`  ✓ Role: Partner (tenant-scoped)`);

  // ── Partner User ──────────────────────────────────────────────────────────────
  const partnerPassword = await bcrypt.hash("Partner@1234!", 12);
  const partnerUser = await prisma.user.upsert({
    where: { email: "partner@demo.com" },
    update: {
      passwordHash: partnerPassword,
      tenantId: tenant.id,
      isActive: true,
    },
    create: {
      email: "partner@demo.com",
      passwordHash: partnerPassword,
      firstName: "Demo",
      lastName: "Partner",
      tenantId: tenant.id,
      isActive: true,
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: partnerUser.id, roleId: partnerRole.id },
    },
    update: {},
    create: { userId: partnerUser.id, roleId: partnerRole.id },
  });
  console.log(`  ✓ Partner user: partner@demo.com  (password: Partner@1234!)`);

  // ── Customer User ──────────────────────────────────────────────────────────────
  const customerPassword = await bcrypt.hash("Customer@1234!", 12);
  const customerUser = await prisma.user.upsert({
    where: { email: "customer@demo.com" },
    update: {
      passwordHash: customerPassword,
      tenantId: tenant.id,
      isActive: true,
    },
    create: {
      email: "customer@demo.com",
      passwordHash: customerPassword,
      firstName: "Demo",
      lastName: "Customer",
      tenantId: tenant.id,
      isActive: true,
    },
  });
  console.log(
    `  ✓ Customer user: customer@demo.com (password: Customer@1234!)`,
  );

  let customerRole = await prisma.role.findFirst({
    where: { name: "Customer", tenantId: tenant.id },
  });
  if (!customerRole) {
    customerRole = await prisma.role.create({
      data: {
        name: "Customer",
        description: "Tenant business owner access",
        isSystem: false,
        tenantId: tenant.id,
      },
    });
  }
  for (const key of ["social:create", "social:read", "social:approve", "social:publish", "support:manage"]) {
    const permId = permissions[key];
    if (permId) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: customerRole.id, permissionId: permId } },
        update: {},
        create: { roleId: customerRole.id, permissionId: permId },
      });
    }
  }
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: customerUser.id, roleId: customerRole.id } },
    update: {},
    create: { userId: customerUser.id, roleId: customerRole.id },
  });

  // Keep the customer-domain record tied to the authenticated user. Customer
  // portal APIs use this id for orders, appointments, invoices, and documents.
  const existingCustomerClient = await prisma.client.findFirst({
    where: { tenantId: tenant.id, email: customerUser.email },
  });
  if (!existingCustomerClient) {
    await prisma.client.create({
      data: {
        id: customerUser.id,
        tenantId: tenant.id,
        email: customerUser.email,
        firstName: customerUser.firstName || "Demo",
        lastName: customerUser.lastName || "Customer",
      },
    });
  }

  // ── Platform Settings ─────────────────────────────────────────────────────────
  const settingsDefs = [
    {
      key: "platformName",
      value: "Vanguard Enterprise",
      description: "Platform display name",
    },
    {
      key: "supportEmail",
      value: "support@enterprise.com",
      description: "Support email address",
    },
    {
      key: "allowSignups",
      value: "true",
      description: "Allow public registrations",
    },
    {
      key: "maintenanceMode",
      value: "false",
      description: "Maintenance mode flag",
    },
  ];

  for (const s of settingsDefs) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }
  console.log(`\n  ✓ Platform settings seeded`);

  // ── AI Provider ───────────────────────────────────────────────────────────────
  const geminiProvider = await prisma.aiProvider.upsert({
    where: { providerKey: "gemini" },
    update: {},
    create: {
      name: "Google Gemini",
      providerKey: "gemini",
      isActive: true,
    },
  });
  // Add models
  const modelDefs = [
    { modelKey: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { modelKey: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  ];
  for (const m of modelDefs) {
    await prisma.aiModel.upsert({
      where: {
        providerId_modelKey: {
          providerId: geminiProvider.id,
          modelKey: m.modelKey,
        },
      },
      update: {},
      create: {
        providerId: geminiProvider.id,
        modelKey: m.modelKey,
        name: m.name,
      },
    });
  }

  const openaiProvider = await prisma.aiProvider.upsert({
    where: { providerKey: "openai" },
    update: {},
    create: { name: "OpenAI", providerKey: "openai", isActive: false },
  });
  await prisma.aiModel.upsert({
    where: {
      providerId_modelKey: {
        providerId: openaiProvider.id,
        modelKey: "gpt-4o",
      },
    },
    update: {},
    create: {
      providerId: openaiProvider.id,
      modelKey: "gpt-4o",
      name: "GPT-4o",
    },
  });

  console.log(`  ✓ AI providers seeded (Gemini, OpenAI)`);

  // ── Subscription Plan ─────────────────────────────────────────────────────────
  await prisma.plan.upsert({
    where: { id: "plan-starter" },
    update: {},
    create: {
      id: "plan-starter",
      name: "Starter",
      description: "Perfect for small businesses",
      price: 29.0,
      interval: "MONTHLY",
      currency: "USD",
      isActive: true,
    },
  });
  await prisma.plan.upsert({
    where: { id: "plan-pro" },
    update: {},
    create: {
      id: "plan-pro",
      name: "Professional",
      description: "For growing teams",
      price: 99.0,
      interval: "MONTHLY",
      currency: "USD",
      isActive: true,
    },
  });
  await prisma.plan.upsert({
    where: { id: "plan-enterprise" },
    update: {},
    create: {
      id: "plan-enterprise",
      name: "Enterprise",
      description: "Unlimited scale",
      price: 499.0,
      interval: "MONTHLY",
      currency: "USD",
      isActive: true,
    },
  });
  // ── Enterprise CAPTCHA Platform Settings ──────────────────────────────────────
  const captchaSettings = [
    {
      key: "CAPTCHA_ENABLED",
      value: "true",
      description: "Enable or disable image CAPTCHA platform-wide",
    },
    {
      key: "CAPTCHA_MIN_LENGTH",
      value: "6",
      description: "Minimum CAPTCHA character length",
    },
    {
      key: "CAPTCHA_MAX_LENGTH",
      value: "6",
      description: "Maximum CAPTCHA character length",
    },
    {
      key: "CAPTCHA_ALLOW_UPPERCASE",
      value: "true",
      description: "Include A-Z in CAPTCHA",
    },
    {
      key: "CAPTCHA_ALLOW_LOWERCASE",
      value: "true",
      description: "Include a-z in CAPTCHA",
    },
    {
      key: "CAPTCHA_ALLOW_NUMBERS",
      value: "true",
      description: "Include 0-9 in CAPTCHA",
    },
    {
      key: "CAPTCHA_ALLOW_SPECIAL",
      value: "false",
      description: "Include special characters in CAPTCHA",
    },
    {
      key: "CAPTCHA_DISTORTION_LEVEL",
      value: "medium",
      description: "Distortion complexity: low, medium, high",
    },
    {
      key: "CAPTCHA_NOISE_LEVEL",
      value: "2",
      description: "Noise dot and line frequency",
    },
    {
      key: "CAPTCHA_EXPIRATION_MINUTES",
      value: "5",
      description: "CAPTCHA expiration timeout in minutes",
    },
    {
      key: "CAPTCHA_MAX_ATTEMPTS",
      value: "5",
      description: "Maximum failed CAPTCHA attempts before lockout",
    },
    {
      key: "CAPTCHA_LOCKOUT_MINUTES",
      value: "15",
      description: "Lockout duration in minutes after max failed attempts",
    },
    {
      key: "CAPTCHA_AUDIO_ENABLED",
      value: "true",
      description: "Enable audio CAPTCHA accessibility fallback",
    },
  ];

  for (const s of captchaSettings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }
  console.log(`  ✓ Enterprise CAPTCHA settings seeded`);

  console.log(`  ✓ Subscription plans seeded`);

  console.log("\n✅  Seeding complete!\n");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  CREDENTIALS");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Admin Portal  → http://localhost:3000");
  console.log("    email:    admin@enterprise.com");
  console.log("    password: Admin@1234!");
  console.log("");
  console.log("  Partner Portal → http://localhost:3001");
  console.log("    email:    partner@demo.com");
  console.log("    password: Partner@1234!");
  console.log("");
  console.log("  Customer Portal → http://localhost:3002");
  console.log("    email:    customer@demo.com");
  console.log("    password: Customer@1234!");
  console.log("");
  console.log("  API Backend    → http://localhost:4000");
  console.log("  API Docs       → http://localhost:4000/api-docs");
  console.log("  DB Portal      → http://localhost:5555");
  console.log("═══════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
