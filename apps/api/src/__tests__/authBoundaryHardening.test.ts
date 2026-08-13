import request from "supertest";
import { prisma } from "@saas/database";
import { app } from "../index";

describe("Authentication tenant-boundary hardening", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const injectedCustomerEmail = `tenant-injection-customer-${runId}@example.com`;
  const injectedPartnerEmail = `tenant-injection-partner-${runId}@example.com`;
  const tenantlessCustomerEmail = `tenantless-customer-${runId}@example.com`;
  const partnerEmail = `safe-partner-${runId}@example.com`;
  let victimTenantId = "";
  let partnerTenantId = "";

  beforeAll(async () => {
    const victimTenant = await prisma.tenant.create({
      data: { name: `Existing Victim Tenant ${runId}` },
    });
    victimTenantId = victimTenant.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            injectedCustomerEmail,
            injectedPartnerEmail,
            tenantlessCustomerEmail,
            partnerEmail,
          ],
        },
      },
    }).catch(() => {});
    if (partnerTenantId) {
      await prisma.tenant.deleteMany({ where: { id: partnerTenantId } }).catch(() => {});
    }
    if (victimTenantId) {
      await prisma.tenant.deleteMany({ where: { id: victimTenantId } }).catch(() => {});
    }
  });

  it("rejects caller-controlled tenant binding for ordinary registration", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: injectedCustomerEmail,
        password: "TenantBoundary123!",
        role: "CUSTOMER",
        tenantId: victimTenantId,
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("CALLER_TENANT_NOT_ALLOWED");
    expect(await prisma.user.findUnique({ where: { email: injectedCustomerEmail } })).toBeNull();
  });

  it("rejects caller-controlled tenant binding for Partner onboarding", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: injectedPartnerEmail,
        password: "TenantBoundary123!",
        role: "PARTNER",
        businessName: "Injected Partner",
        tenantId: victimTenantId,
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("CALLER_TENANT_NOT_ALLOWED");
    expect(await prisma.user.findUnique({ where: { email: injectedPartnerEmail } })).toBeNull();
  });

  it("keeps an ordinary Customer registration tenantless until onboarding", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: tenantlessCustomerEmail,
        password: "TenantBoundary123!",
        role: "CUSTOMER_USER",
        firstName: "Tenantless",
        lastName: "Customer",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.onboardingRequired).toBe(true);
    const user = await prisma.user.findUnique({ where: { email: tenantlessCustomerEmail } });
    expect(user?.tenantId).toBeNull();
  });

  it("creates an isolated server-owned tenant and Partner role for Partner onboarding", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: partnerEmail,
        password: "TenantBoundary123!",
        role: "PARTNER",
        tenantName: `Safe Partner ${runId}`,
        firstName: "Safe",
        lastName: "Partner",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.approvalStatus).toBe("PENDING_APPROVAL");

    const user = await prisma.user.findUnique({
      where: { email: partnerEmail },
      include: { tenant: true, roles: { include: { role: true } } },
    });
    partnerTenantId = user?.tenantId || "";

    expect(user?.tenantId).toBeTruthy();
    expect(user?.tenantId).not.toBe(victimTenantId);
    expect(user?.tenant?.name).toBe(`Safe Partner ${runId}`);
    expect(user?.roles.map(({ role }) => role.name)).toContain("Partner");
    expect(user?.roles.every(({ role }) => role.tenantId === user.tenantId)).toBe(true);
  });
});
