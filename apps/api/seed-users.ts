import { prisma } from "@saas/database";
import bcrypt from "bcryptjs";

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Super Admin Permission
  let adminPerm = await prisma.permission.upsert({
    where: { resource_action: { resource: "*", action: "*" } },
    update: {},
    create: { resource: "*", action: "*", description: "All access" },
  });

  // Super Admin Role
  let adminRole = await prisma.role.findFirst({
    where: { name: "Super Admin" },
  });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: "Super Admin",
        description: "Global administrator",
        isSystem: true,
      },
    });
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: adminPerm.id },
    });
  }

  // Super Admin User
  let adminUser = await prisma.user.findUnique({
    where: { email: "admin@platform.local" },
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: "admin@platform.local",
        firstName: "Super",
        lastName: "Admin",
        passwordHash: hashedPassword,
      },
    });
  } else {
    adminUser = await prisma.user.update({
      where: { email: "admin@platform.local" },
      data: { passwordHash: hashedPassword },
    });
  }

  // Assign Role to Super Admin
  const adminRoleCheck = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
  });
  if (!adminRoleCheck) {
    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id },
    });
  }

  console.log("Admin User Seeded: admin@platform.local / password123");

  // Create a Demo Tenant
  let tenant = await prisma.tenant.findUnique({
    where: { domain: "demo.platform.local" },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Demo Partner",
        domain: "demo.platform.local",
        isActive: true,
      },
    });
  }

  // Partner Permissions
  const permResources = ["clients", "social-posts", "ai-content"];
  for (const res of permResources) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: res, action: "*" } },
      update: {},
      create: { resource: res, action: "*", description: `${res} access` },
    });
  }

  // Partner Role
  let partnerRole = await prisma.role.findFirst({
    where: { name: "Partner Admin" },
  });
  if (!partnerRole) {
    partnerRole = await prisma.role.create({
      data: {
        name: "Partner Admin",
        description: "Partner administrator",
        tenantId: tenant.id,
      },
    });

    // Assign permissions
    for (const res of permResources) {
      const p = await prisma.permission.findUnique({
        where: { resource_action: { resource: res, action: "*" } },
      });
      if (p) {
        await prisma.rolePermission.create({
          data: { roleId: partnerRole.id, permissionId: p.id },
        });
      }
    }
  }

  // Partner User
  let partnerUser = await prisma.user.findUnique({
    where: { email: "partner@demo.local" },
  });
  if (!partnerUser) {
    partnerUser = await prisma.user.create({
      data: {
        email: "partner@demo.local",
        firstName: "Demo",
        lastName: "Partner",
        passwordHash: hashedPassword,
        tenantId: tenant.id,
      },
    });
  } else {
    partnerUser = await prisma.user.update({
      where: { email: "partner@demo.local" },
      data: { passwordHash: hashedPassword, tenantId: tenant.id },
    });
  }

  // Assign Role to Partner
  const partnerRoleCheck = await prisma.userRole.findUnique({
    where: {
      userId_roleId: { userId: partnerUser.id, roleId: partnerRole.id },
    },
  });
  if (!partnerRoleCheck) {
    await prisma.userRole.create({
      data: { userId: partnerUser.id, roleId: partnerRole.id },
    });
  }

  console.log("Partner User Seeded: partner@demo.local / password123");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
