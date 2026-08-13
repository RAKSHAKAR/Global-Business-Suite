import { prisma, executeDatabaseBackup, verifyAndRestoreBackup, runDataIntegrityCheck } from "@saas/database";

describe("Phase 9 – Enterprise Database & Data Architecture Test Suite", () => {
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Seed or fetch test tenant and user
    const tenant = await prisma.tenant.upsert({
      where: { domain: "phase9.test.local" },
      update: {},
      create: {
        name: "Phase 9 Enterprise Test Tenant",
        domain: "phase9.test.local",
        primaryColor: "#D4AF37",
      },
    });
    testTenantId = tenant.id;

    const user = await prisma.user.upsert({
      where: { email: "phase9.test@platform.local" },
      update: {},
      create: {
        email: "phase9.test@platform.local",
        firstName: "Database",
        lastName: "Architect",
        tenantId: testTenantId,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("1. Master Data Lookups should be present and valid", async () => {
    const countries = await prisma.country.findMany();
    const currencies = await prisma.currency.findMany();
    const languages = await prisma.language.findMany();
    const categories = await prisma.businessCategory.findMany();

    expect(countries.length).toBeGreaterThan(0);
    expect(currencies.length).toBeGreaterThan(0);
    expect(languages.length).toBeGreaterThan(0);
    expect(categories.length).toBeGreaterThan(0);

    const us = countries.find((c) => c.code === "US");
    expect(us).toBeDefined();
    expect(us?.phoneCode).toBe("+1");

    const usd = currencies.find((c) => c.code === "USD");
    expect(usd).toBeDefined();
    expect(usd?.symbol).toBe("$");
  });

  test("2. Soft-Delete and Enterprise Audit fields should operate correctly", async () => {
    const tempLocation = await prisma.location.create({
      data: {
        tenantId: testTenantId,
        googleLocationId: `test-loc-${Date.now()}`,
        locationName: "Temp Test Store",
        title: "Temp Test Store on Google",
      },
    });

    expect(tempLocation).toBeDefined();

    // Soft delete Tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id: testTenantId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: testUserId,
        updatedBy: testUserId,
      },
    });

    expect(updatedTenant.isDeleted).toBe(true);
    expect(updatedTenant.deletedAt).toBeDefined();
    expect(updatedTenant.deletedBy).toBe(testUserId);

    // Restore tenant for subsequent tests
    await prisma.tenant.update({
      where: { id: testTenantId },
      data: { isDeleted: false, deletedAt: null, deletedBy: null },
    });
  });

  test("3. In-App Notifications delivery and read status persistence", async () => {
    const notification = await prisma.notification.create({
      data: {
        userId: testUserId,
        tenantId: testTenantId,
        type: "ALERT",
        title: "Test System Alert",
        body: "Database indexing and verification step complete.",
        actionUrl: "/admin/analytics",
      },
    });

    expect(notification.id).toBeDefined();
    expect(notification.isRead).toBe(false);

    const readNotification = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true, readAt: new Date() },
    });

    expect(readNotification.isRead).toBe(true);
    expect(readNotification.readAt).toBeDefined();
  });

  test("4. AI Engine Token Usage, Cost Tracking and Vector Storage", async () => {
    const aiLog = await prisma.aiUsageLog.create({
      data: {
        tenantId: testTenantId,
        userId: testUserId,
        providerKey: "openai",
        modelKey: "gpt-4o",
        promptTokens: 500,
        completionTokens: 250,
        totalTokens: 750,
        estimatedCost: 0.0075,
        latencyMs: 420,
        status: "SUCCESS",
      },
    });

    expect(aiLog.id).toBeDefined();
    expect(aiLog.totalTokens).toBe(750);
    expect(aiLog.estimatedCost).toBe(0.0075);

    const vectorEmbedding = await prisma.aiEmbedding.create({
      data: {
        tenantId: testTenantId,
        resourceType: "KnowledgeBase",
        resourceId: `kb-article-${Date.now()}`,
        vectorJson: JSON.stringify([0.012, -0.045, 0.891, 0.123]),
        contentHash: "a1b2c3d4e5f6",
      },
    });

    expect(vectorEmbedding.id).toBeDefined();
    expect(vectorEmbedding.resourceType).toBe("KnowledgeBase");
  });

  test("5. Audit Change Log delta tracking", async () => {
    const auditChange = await prisma.auditChangeLog.create({
      data: {
        tenantId: testTenantId,
        userId: testUserId,
        entityType: "User",
        entityId: testUserId,
        action: "UPDATE",
        changesJson: JSON.stringify({
          firstName: { old: "Database", new: "Enterprise Architecture" },
        }),
        ipAddress: "127.0.0.1",
      },
    });

    expect(auditChange.id).toBeDefined();
    expect(auditChange.action).toBe("UPDATE");
    expect(auditChange.entityType).toBe("User");
  });

  test("6. Enterprise Data Integrity Scanner", async () => {
    const report = await runDataIntegrityCheck();
    expect(report.totalChecks).toBeGreaterThan(0);
    expect(report.passedChecks).toBe(report.totalChecks);
    expect(report.failedChecks).toBe(0);
  });

  test("7. Point-In-Time Backup & Recovery Strategy", async () => {
    const backup = await executeDatabaseBackup("FULL");
    expect(backup.backupId).toBeDefined();
    expect(backup.status).toBe("COMPLETED");
    expect(backup.checksum).toBeDefined();

    const restoreCheck = await verifyAndRestoreBackup(backup.backupPath);
    expect(restoreCheck.success).toBe(true);
    expect(restoreCheck.message).toContain("Verified backup");
  });
});
