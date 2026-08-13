import { prisma } from "@saas/database";

export class SessionDeviceService {
  /**
   * Track or update user session & device footprint
   */
  static async registerSession(userId: string, sessionToken: string, req: any) {
    const userAgent = req.headers["user-agent"] || "Unknown Device";
    const ipAddress = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").toString();

    // Create session record
    const session = await (prisma as any).session.create({
      data: {
        sessionToken,
        userId,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ipAddress,
        userAgent,
        lastActivityAt: new Date(),
      },
    });

    // Device recognition
    const existingDevice = await (prisma as any).device.findFirst({
      where: { userId, osVersion: userAgent.substring(0, 50) },
    });

    if (existingDevice) {
      await (prisma as any).device.update({
        where: { id: existingDevice.id },
        data: {
          lastLogin: new Date(),
          ipAddress,
        },
      });
    } else {
      await (prisma as any).device.create({
        data: {
          userId,
          deviceName: userAgent.includes("Mobile") ? "Mobile Device" : "Desktop Browser",
          osVersion: userAgent.substring(0, 50),
          ipAddress,
          lastLogin: new Date(),
        },
      });
    }

    return session;
  }

  /**
   * List all active sessions for a user
   */
  static async getActiveSessions(userId: string) {
    return (prisma as any).session.findMany({
      where: {
        userId,
        revokedAt: null,
        expires: { gt: new Date() },
      },
      orderBy: { lastActivityAt: "desc" },
    });
  }

  /**
   * Revoke a single active session
   */
  static async revokeSession(sessionId: string, userId: string) {
    return (prisma as any).session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all sessions for a user except current session
   */
  static async revokeAllSessionsExcept(userId: string, currentSessionToken?: string) {
    return (prisma as any).session.updateMany({
      where: {
        userId,
        sessionToken: currentSessionToken ? { not: currentSessionToken } : undefined,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * List user's registered devices
   */
  static async getUserDevices(userId: string) {
    return (prisma as any).device.findMany({
      where: { userId },
      orderBy: { lastLogin: "desc" },
    });
  }

  /**
   * Delete / deregister a user device
   */
  static async deleteDevice(deviceId: string, userId: string) {
    return (prisma as any).device.deleteMany({
      where: { id: deviceId, userId },
    });
  }
}
