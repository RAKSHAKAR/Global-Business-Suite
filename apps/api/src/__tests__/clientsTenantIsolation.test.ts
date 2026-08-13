import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { prisma } from "@saas/database";
import { JWT_SECRET } from "../config/jwt";
import { clientsRouter } from "../routes/v1/clients";

const app = express();
app.use(express.json());
app.use("/api/v1/clients", clientsRouter);

describe("clients API tenant isolation", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const userEmail = `clients-manager-${runId}@example.com`;
  let ownTenantId = "";
  let foreignTenantId = "";
  let ownClientId = "";
  let foreignClientId = "";
  let userId = "";
  let roleId = "";
  let token = "";

  beforeAll(async () => {
    const [ownTenant, foreignTenant] = await Promise.all([
      prisma.tenant.create({ data: { name: `Clients Own ${runId}` } }),
      prisma.tenant.create({ data: { name: `Clients Foreign ${runId}` } }),
    ]);
    ownTenantId = ownTenant.id;
    foreignTenantId = foreignTenant.id;

    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource: "clients", action: "manage" } },
      update: {},
      create: { resource: "clients", action: "manage" },
    });
    const role = await prisma.role.create({
      data: { name: `Clients Manager ${runId}`, tenantId: ownTenantId },
    });
    roleId = role.id;
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });

    const user = await prisma.user.create({
      data: {
        email: userEmail,
        tenantId: ownTenantId,
        isActive: true,
        approvalStatus: "APPROVED",
      },
    });
    userId = user.id;
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    const [ownClient, foreignClient] = await Promise.all([
      prisma.client.create({
        data: {
          tenantId: ownTenantId,
          firstName: "Own",
          lastName: "Client",
          email: `own-client-${runId}@example.com`,
        },
      }),
      prisma.client.create({
        data: {
          tenantId: foreignTenantId,
          firstName: "Foreign",
          lastName: "Client",
          email: `foreign-client-${runId}@example.com`,
        },
      }),
    ]);
    ownClientId = ownClient.id;
    foreignClientId = foreignClient.id;

    token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: ownTenantId,
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
  });

  afterAll(async () => {
    await prisma.client.deleteMany({
      where: { tenantId: { in: [ownTenantId, foreignTenantId].filter(Boolean) } },
    }).catch(() => {});
    if (userId) await prisma.user.deleteMany({ where: { id: userId } }).catch(() => {});
    if (roleId) await prisma.role.deleteMany({ where: { id: roleId } }).catch(() => {});
    await prisma.tenant.deleteMany({
      where: { id: { in: [ownTenantId, foreignTenantId].filter(Boolean) } },
    }).catch(() => {});
  });

  it("ignores a query tenantId and lists only the authenticated tenant", async () => {
    const response = await request(app)
      .get(`/api/v1/clients?tenantId=${foreignTenantId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    const ids = response.body.data.map((client: { id: string }) => client.id);
    expect(ids).toContain(ownClientId);
    expect(ids).not.toContain(foreignClientId);
  });

  it("ignores a body tenantId and creates under the authenticated tenant", async () => {
    const response = await request(app)
      .post("/api/v1/clients")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tenantId: foreignTenantId,
        firstName: "Server",
        lastName: "Scoped",
        email: `server-scoped-${runId}@example.com`,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.tenantId).toBe(ownTenantId);
  });

  it("returns 404 rather than updating a foreign-tenant client", async () => {
    const response = await request(app)
      .put(`/api/v1/clients/${foreignClientId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Compromised" });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("CLIENT_NOT_FOUND");
    const foreignClient = await prisma.client.findUnique({ where: { id: foreignClientId } });
    expect(foreignClient?.firstName).toBe("Foreign");
  });

  it("returns 404 rather than deleting a foreign-tenant client", async () => {
    const response = await request(app)
      .delete(`/api/v1/clients/${foreignClientId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("CLIENT_NOT_FOUND");
    expect(await prisma.client.findUnique({ where: { id: foreignClientId } })).not.toBeNull();
  });
});
