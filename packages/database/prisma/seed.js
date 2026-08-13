const { PrismaClient } = require("../generated/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding the database...");

  // 1. Create a Default Tenant (Super Admin Company)
  const tenant = await prisma.tenant.upsert({
    where: { domain: "admin.platform.local" },
    update: {},
    create: {
      name: "Super Admin HQ",
      domain: "admin.platform.local",
    },
  });

  // 2. Create Permissions
  const permissions = [
    { resource: "tenants", action: "manage" },
    { resource: "users", action: "manage" },
    { resource: "roles", action: "manage" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: { resource: p.resource, action: p.action },
      },
      update: {},
      create: {
        resource: p.resource,
        action: p.action,
        description: `Can ${p.action} ${p.resource}`,
      },
    });
  }

  // 3. Create Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: {
      name_tenantId: {
        name: "Super Administrator",
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      name: "Super Administrator",
      description: "System-wide full access",
      isSystem: true,
      tenantId: tenant.id,
    },
  });

  // Assign permissions to the Super Admin Role
  const allPerms = await prisma.permission.findMany();
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: p.id,
      },
    });
  }

  // 4. Create an Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@platform.local" },
    update: {
      passwordHash:
        "$2b$10$FJXFiNhhzZAxbgrFt4RTr.AvShFgs2COGmqbWhomvud5HYwoFdhMS",
    },
    create: {
      email: "admin@platform.local",
      firstName: "Super",
      lastName: "Admin",
      passwordHash:
        "$2b$10$FJXFiNhhzZAxbgrFt4RTr.AvShFgs2COGmqbWhomvud5HYwoFdhMS",
      tenantId: tenant.id,
    },
  });

  // Assign user to role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  // 5. Seed Master Data Lookups
  const countries = [
    { code: "US", name: "United States", phoneCode: "+1", currencyCode: "USD" },
    { code: "IN", name: "India", phoneCode: "+91", currencyCode: "INR" },
    { code: "GB", name: "United Kingdom", phoneCode: "+44", currencyCode: "GBP" },
    { code: "CA", name: "Canada", phoneCode: "+1", currencyCode: "CAD" },
    { code: "AU", name: "Australia", phoneCode: "+61", currencyCode: "AUD" },
  ];

  for (const c of countries) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1.0 },
    { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.92 },
    { code: "INR", name: "Indian Rupee", symbol: "₹", exchangeRate: 83.5 },
    { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 0.78 },
  ];

  for (const curr of currencies) {
    await prisma.currency.upsert({
      where: { code: curr.code },
      update: {},
      create: curr,
    });
  }

  const languages = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }

  const categories = [
    { key: "RETAIL", name: "Retail & E-commerce", industry: "COMMERCE" },
    { key: "HEALTHCARE", name: "Healthcare & Wellness", industry: "MEDICAL" },
    { key: "REST_BAR", name: "Restaurant & Bar", industry: "HOSPITALITY" },
    { key: "SALON_SPA", name: "Salon & Spa", industry: "PERSONAL_CARE" },
  ];

  for (const cat of categories) {
    await prisma.businessCategory.upsert({
      where: { key: cat.key },
      update: {},
      create: cat,
    });
  }

  // 6. Seed Sample Notification & Audit Log
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      tenantId: tenant.id,
      type: "SUCCESS",
      title: "Welcome to GBS Enterprise Architecture",
      body: "Phase 9 Enterprise Database & Data Architecture initialized successfully.",
    },
  });

  await prisma.aiUsageLog.create({
    data: {
      tenantId: tenant.id,
      userId: adminUser.id,
      providerKey: "gemini",
      modelKey: "gemini-1.5-pro",
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200,
      estimatedCost: 0.0004,
      latencyMs: 340,
      status: "SUCCESS",
    },
  });

  await prisma.auditChangeLog.create({
    data: {
      tenantId: tenant.id,
      userId: adminUser.id,
      entityType: "Tenant",
      entityId: tenant.id,
      action: "CREATE",
      changesJson: JSON.stringify({ name: { old: null, new: tenant.name } }),
      ipAddress: "127.0.0.1",
    },
  });

  console.log("Seeding completed.");
  console.log("Admin Email:", adminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
