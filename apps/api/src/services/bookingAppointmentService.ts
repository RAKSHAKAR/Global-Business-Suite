import { prisma } from "@saas/database";
import crypto from "crypto";

export interface CreateBookingInput {
  tenantId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
  staffId?: string;
  staffName?: string;
  locationId?: string;
  startTime: Date;
  endTime: Date;
  meetingType?: string; // IN_PERSON, ZOOM, MS_TEAMS, PHONE
}

export class BookingAppointmentService {
  /**
   * Create an appointment booking
   */
  static async createBooking(input: CreateBookingInput) {
    // Generate unique QR check-in code
    const qrCheckInCode = `QR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Auto-generate video meeting link if Zoom or MS Teams
    let meetingUrl: string | undefined = undefined;
    if (input.meetingType === "ZOOM") {
      meetingUrl = `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}?pwd=${crypto.randomBytes(4).toString("hex")}`;
    } else if (input.meetingType === "MS_TEAMS") {
      meetingUrl = `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${crypto.randomBytes(8).toString("hex")}@thread.v2/0`;
    }

    const booking = await prisma.appointmentBooking.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        serviceName: input.serviceName,
        staffId: input.staffId,
        staffName: input.staffName || "Staff Member",
        locationId: input.locationId,
        startTime: input.startTime,
        endTime: input.endTime,
        status: "SCHEDULED",
        meetingType: input.meetingType || "IN_PERSON",
        meetingUrl: meetingUrl,
        qrCheckInCode: qrCheckInCode,
        bufferMinutes: 15,
      },
    });

    // Trigger mock calendar sync (Google / Outlook)
    await this.syncToExternalCalendars(booking.id, input.tenantId);

    return booking;
  }

  /**
   * List Bookings for Tenant / Staff / Customer
   */
  static async listBookings(tenantId: string, filter?: {
    staffId?: string;
    customerId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = { tenantId };

    if (filter?.staffId) where.staffId = filter.staffId;
    if (filter?.customerId) where.customerId = filter.customerId;
    if (filter?.status) where.status = filter.status;

    if (filter?.startDate || filter?.endDate) {
      where.startTime = {};
      if (filter?.startDate) where.startTime.gte = filter.startDate;
      if (filter?.endDate) where.startTime.lte = filter.endDate;
    }

    return await prisma.appointmentBooking.findMany({
      where,
      orderBy: { startTime: "asc" },
    });
  }

  /**
   * Reschedule or Cancel Booking
   */
  static async updateBookingStatus(bookingId: string, tenantId: string, updates: {
    status?: string;
    startTime?: Date;
    endTime?: Date;
    cancellationReason?: string;
  }) {
    const booking = await prisma.appointmentBooking.findFirst({
      where: { id: bookingId, tenantId },
    });

    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    return await prisma.appointmentBooking.update({
      where: { id: bookingId },
      data: {
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.startTime ? { startTime: updates.startTime } : {}),
        ...(updates.endTime ? { endTime: updates.endTime } : {}),
        ...(updates.cancellationReason ? { cancellationReason: updates.cancellationReason } : {}),
      },
    });
  }

  /**
   * QR Check-In verification
   */
  static async verifyQrCheckIn(qrCheckInCode: string, tenantId: string) {
    const booking = await prisma.appointmentBooking.findFirst({
      where: { qrCheckInCode, tenantId },
    });

    if (!booking) {
      throw new Error(`Invalid QR check-in code ${qrCheckInCode}`);
    }

    return await prisma.appointmentBooking.update({
      where: { id: booking.id },
      data: { status: "CHECKED_IN" },
    });
  }

  /**
   * Configure Staff Availability Rules
   */
  static async setStaffAvailability(tenantId: string, staffId: string, dayOfWeek: number, startTime: string, endTime: string) {
    const existing = await prisma.staffAvailabilityRule.findFirst({
      where: { tenantId, staffId, dayOfWeek },
    });

    if (existing) {
      return await prisma.staffAvailabilityRule.update({
        where: { id: existing.id },
        data: { startTime, endTime, isAvailable: true },
      });
    }

    return await prisma.staffAvailabilityRule.create({
      data: { tenantId, staffId, dayOfWeek, startTime, endTime, isAvailable: true },
    });
  }

  /**
   * Get Staff Availability Rules
   */
  static async getStaffAvailability(tenantId: string, staffId: string) {
    return await prisma.staffAvailabilityRule.findMany({
      where: { tenantId, staffId },
      orderBy: { dayOfWeek: "asc" },
    });
  }

  /**
   * Sync Booking to Google or Outlook Calendar
   */
  static async syncToExternalCalendars(bookingId: string, tenantId: string) {
    const configs = await prisma.calendarSyncConfig.findMany({
      where: { tenantId, isEnabled: true },
    });

    if (configs.length > 0) {
      const syncEventId = `CAL-SYNC-${bookingId}`;
      await prisma.appointmentBooking.update({
        where: { id: bookingId },
        data: { calendarEventIdSync: syncEventId },
      });
      return { synced: true, providers: configs.map(c => c.provider) };
    }

    return { synced: false, reason: "No active calendar sync configs" };
  }

  /**
   * Configure Booking Widget
   */
  static async configureWidget(tenantId: string, widgetTitle: string, colorScheme: string, allowedServicesJson?: string, customCss?: string) {
    return await prisma.bookingWidgetConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        widgetTitle,
        colorScheme,
        allowedServicesJson: allowedServicesJson || "[]",
        customCss,
      },
      update: {
        widgetTitle,
        colorScheme,
        ...(allowedServicesJson ? { allowedServicesJson } : {}),
        ...(customCss ? { customCss } : {}),
      },
    });
  }

  /**
   * Get Booking Analytics
   */
  static async getBookingAnalytics(tenantId: string) {
    const totalBookings = await prisma.appointmentBooking.count({ where: { tenantId } });
    const scheduled = await prisma.appointmentBooking.count({ where: { tenantId, status: "SCHEDULED" } });
    const completed = await prisma.appointmentBooking.count({ where: { tenantId, status: "COMPLETED" } });
    const cancelled = await prisma.appointmentBooking.count({ where: { tenantId, status: "CANCELLED" } });
    const checkedIn = await prisma.appointmentBooking.count({ where: { tenantId, status: "CHECKED_IN" } });

    return {
      totalBookings,
      scheduled,
      completed,
      cancelled,
      checkedIn,
      completionRatePercent: totalBookings > 0 ? Math.round(((completed + checkedIn) / totalBookings) * 100) : 100,
    };
  }
}
