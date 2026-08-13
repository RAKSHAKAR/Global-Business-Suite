import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.platformSetting.upsert({
    where: { key: "geminiApiKey" },
    update: { value: process.env.GEMINI_API_KEY || "" },
    create: {
      key: "geminiApiKey",
      value: process.env.GEMINI_API_KEY || "",
      description: "Google Gemini API Key",
    },
  });

  await prisma.platformSetting.upsert({
    where: { key: "defaultAiEngine" },
    update: { value: "gemini" },
    create: {
      key: "defaultAiEngine",
      value: "gemini",
      description: "Default AI Engine used in platform",
    },
  });

  await prisma.platformSetting.upsert({
    where: { key: "openaiApiKey" },
    update: { value: "" },
    create: { key: "openaiApiKey", value: "", description: "OpenAI API Key" },
  });

  await prisma.platformSetting.upsert({
    where: { key: "anthropicApiKey" },
    update: { value: "" },
    create: {
      key: "anthropicApiKey",
      value: "",
      description: "Anthropic API Key",
    },
  });

  console.log("AI Engine settings seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
