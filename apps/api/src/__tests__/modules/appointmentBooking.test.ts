import { BookingAppointmentService } from "../../services/bookingAppointmentService";

describe("Appointment & Booking Subsystem (Phase 19 Automated Tests)", () => {
  const testTenantId = "test-tenant-booking-103";

  it("should create an appointment booking with QR check-in and video meeting link", async () => {
    const startTime = new Date(Date.now() + 86400 * 1000);
    const endTime = new Date(startTime.getTime() + 1800 * 1000);

    const booking = await BookingAppointmentService.createBooking({
      tenantId: testTenantId,
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      customerPhone: "+15550001111",
      serviceName: "Enterprise Consultation",
      startTime,
      endTime,
      meetingType: "ZOOM",
    });

    expect(booking.id).toBeDefined();
    expect(booking.status).toBe("SCHEDULED");
    expect(booking.qrCheckInCode).toBeDefined();
    expect(booking.meetingUrl).toContain("zoom.us");

    const bookingsList = await BookingAppointmentService.listBookings(testTenantId);
    expect(bookingsList.length).toBeGreaterThan(0);
  });

  it("should verify QR check-in code", async () => {
    const bookingsList = await BookingAppointmentService.listBookings(testTenantId);
    const booking = bookingsList[0];

    const checkedIn = await BookingAppointmentService.verifyQrCheckIn(booking.qrCheckInCode!, testTenantId);
    expect(checkedIn.status).toBe("CHECKED_IN");
  });

  it("should configure staff availability rules and booking widget", async () => {
    const availability = await BookingAppointmentService.setStaffAvailability(testTenantId, "staff-1", 1, "09:00", "17:00");
    expect(availability.dayOfWeek).toBe(1);

    const widget = await BookingAppointmentService.configureWidget(testTenantId, "Schedule Consultation", "#D4AF37");
    expect(widget.widgetTitle).toBe("Schedule Consultation");
  });

  it("should generate booking analytics", async () => {
    const analytics = await BookingAppointmentService.getBookingAnalytics(testTenantId);
    expect(analytics.totalBookings).toBeGreaterThanOrEqual(1);
    expect(analytics.completionRatePercent).toBeGreaterThanOrEqual(0);
  });
});
