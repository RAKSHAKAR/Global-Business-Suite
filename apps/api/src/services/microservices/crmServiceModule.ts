import { prisma } from "@saas/database";
import { eventBus } from "../eventBus";

export class CRMServiceModule {
  public async getPipelines(tenantId: string) {
    return [
      {
        id: "pipe_default",
        name: "Standard Sales Pipeline",
        tenantId,
        stages: [
          { id: "lead", name: "New Lead", order: 1 },
          { id: "contacted", name: "Contacted", order: 2 },
          { id: "proposal", name: "Proposal Sent", order: 3 },
          { id: "won", name: "Closed Won", order: 4 },
          { id: "lost", name: "Closed Lost", order: 5 },
        ],
      },
    ];
  }

  public async createLead(data: { tenantId: string; name: string; email: string; phone?: string; notes?: string }) {
    const lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: data.tenantId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    eventBus.publish("crm:lead_created", lead, { tenantId: data.tenantId });

    return lead;
  }
}

export const crmServiceModule = new CRMServiceModule();
