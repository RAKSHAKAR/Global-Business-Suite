const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Super Admin Role
  let adminRole = await prisma.role.findFirst({ where: { name: 'Super Admin' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Global administrator',
        permissions: JSON.stringify(['*:*'])
      }
    });
  }

  // Super Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@platform.local' },
    update: { password: hashedPassword, roleId: adminRole.id },
    create: {
      email: 'admin@platform.local',
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
      roleId: adminRole.id
    }
  });

  console.log('Admin User Seeded: admin@platform.local / password123');

  // Create a Demo Tenant
  let tenant = await prisma.tenant.findFirst({ where: { domain: 'demo.platform.local' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Partner',
        domain: 'demo.platform.local',
        isActive: true
      }
    });
  }

  // Partner Role
  let partnerRole = await prisma.role.findFirst({ where: { name: 'Partner Admin' } });
  if (!partnerRole) {
    partnerRole = await prisma.role.create({
      data: {
        name: 'Partner Admin',
        description: 'Partner administrator',
        permissions: JSON.stringify(['clients:*', 'social-posts:*', 'ai-content:*'])
      }
    });
  }

  // Partner User
  const partnerUser = await prisma.user.upsert({
    where: { email: 'partner@demo.local' },
    update: { password: hashedPassword, roleId: partnerRole.id, tenantId: tenant.id },
    create: {
      email: 'partner@demo.local',
      firstName: 'Demo',
      lastName: 'Partner',
      password: hashedPassword,
      roleId: partnerRole.id,
      tenantId: tenant.id
    }
  });

  console.log('Partner User Seeded: partner@demo.local / password123');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
