const { PrismaClient } = require('@saas/database');
const prisma = new PrismaClient();

async function testSync() {
  try {
    const providerId = '8800f895-9335-45a1-ae14-38438b0156a4';
    const provider = await prisma.aiProvider.findUnique({
      where: { id: providerId }
    });
    
    if (!provider) {
      console.log("Provider not found:", providerId);
      return;
    }
    
    console.log("Found provider:", provider.name, "Key:", provider.providerKey);
    const apiKey = provider.apiKey;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch from Google Gemini API: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("Fetched models count:", data.models?.length);
    
    let modelsToUpsert = (data.models || [])
      .filter(m => m.name.includes('gemini'))
      .map(m => ({
        modelKey: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', '')
      }));

    console.log("Upserting models...");
    let count = 0;
    for (const m of modelsToUpsert) {
      await prisma.aiModel.upsert({
        where: {
          providerId_modelKey: {
            providerId: provider.id,
            modelKey: m.modelKey
          }
        },
        update: { name: m.name, isActive: true },
        create: { providerId: provider.id, modelKey: m.modelKey, name: m.name, isActive: true }
      });
      count++;
    }
    console.log("Successfully synced", count, "models");
    
  } catch (e) {
    console.error("Error during sync test:", e);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
