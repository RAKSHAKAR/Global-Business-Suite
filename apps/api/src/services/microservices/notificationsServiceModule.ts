import { prisma } from "@saas/database";
import { eventBus } from "../eventBus";
import { logger } from "../../utils/logger";

export interface SendNotificationPayload {
  tenantId: string;
  userId?: string;
  recipient: string; // Email, Phone, or User ID
  channel: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "IN_APP";
  title: string;
  body: string;
  metadata?: Record<string, any>;
}

export class NotificationsServiceModule {
  public async sendNotification(payload: SendNotificationPayload) {
    logger.info(`[NotificationsServiceModule] Dispatching notification [${payload.channel}] to ${payload.recipient}`, {
      tenantId: payload.tenantId,
      userId: payload.userId,
    });

    const notificationRecord = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: payload.tenantId,
      userId: payload.userId,
      channel: payload.channel,
      title: payload.title,
      body: payload.body,
      status: "DELIVERED",
      createdAt: new Date().toISOString(),
    };

    eventBus.publish("notification:sent", notificationRecord, {
      tenantId: payload.tenantId,
      userId: payload.userId,
    });

    return notificationRecord;
  }

  public async getNotificationPreferences(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, roles: true },
    });

    return {
      userId: user?.id || userId,
      emailNotifications: true,
      smsNotifications: false,
      whatsappNotifications: true,
      pushNotifications: true,
    };
  }
}

export const notificationsServiceModule = new NotificationsServiceModule();
