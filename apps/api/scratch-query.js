const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@saas/database');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.updateMany({ data: { passwordHash: hash } });
  console.log('Passwords updated to password123');
}
main();
