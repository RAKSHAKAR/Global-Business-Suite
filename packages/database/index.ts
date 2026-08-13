import { PrismaClient } from "./generated/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export * from "./generated/client";
export * from "./scripts/backup-restore-strategy";
export * from "./scripts/check-data-integrity";


