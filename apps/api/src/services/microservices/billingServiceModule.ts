import { prisma } from "@saas/database";
import { eventBus } from "../eventBus";

export class BillingServiceModule {
  public async getTenantSubscription(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: { include: { plan: true } },
        aiConfigs: true,
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found.");
    }

    const activeSub = tenant.subscriptions?.[0];

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      plan: activeSub?.plan?.name || "GROWTH",
      status: activeSub?.status || "ACTIVE",
      aiConfigs: tenant.aiConfigs,
      billingCycle: activeSub?.plan?.interval || "MONTHLY",
      nextBillingDate: activeSub?.currentPeriodEnd ? activeSub.currentPeriodEnd.toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  public async processPaymentWebhook(event: { tenantId: string; amount: number; invoiceId: string; status: string }) {
    eventBus.publish("billing:payment", event, { tenantId: event.tenantId });
    return { success: true, processedAt: new Date().toISOString() };
  }
}

export const billingServiceModule = new BillingServiceModule();
