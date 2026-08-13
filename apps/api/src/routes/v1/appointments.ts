import { Router, Request, Response } from "express";
import { BookingAppointmentService } from "../../services/bookingAppointmentService";

export const appointmentsRouter = Router();

// GET /api/v1/bookings & /api/v1/bookings/appointments
const listAppointmentsHandler = async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const staffId = req.query.staffId as string;
    const customerId = req.query.customerId as string;
    const status = req.query.status as string;

    const bookings = await BookingAppointmentService.listBookings(tenantId, { staffId, customerId, status });
    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

appointmentsRouter.get("/", listAppointmentsHandler);
appointmentsRouter.get("/appointments", listAppointmentsHandler);

// POST /api/v1/bookings
appointmentsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const booking = await BookingAppointmentService.createBooking({
      ...req.body,
      tenantId,
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime),
    });
    res.status(201).json({ success: true, data: booking });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/bookings/:id/status
appointmentsRouter.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const updated = await BookingAppointmentService.updateBookingStatus(req.params.id, tenantId, req.body);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/bookings/qr-checkin
appointmentsRouter.post("/qr-checkin", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const { qrCheckInCode } = req.body;
    const checkedIn = await BookingAppointmentService.verifyQrCheckIn(qrCheckInCode, tenantId);
    res.json({ success: true, data: checkedIn });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/v1/bookings/analytics
appointmentsRouter.get("/analytics", async (req: Request, res: Response) => {
  try {
    const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const analytics = await BookingAppointmentService.getBookingAnalytics(tenantId);
    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/bookings/widget-config
appointmentsRouter.post("/widget-config", async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req.headers["x-tenant-id"] as string) || "default-tenant";
    const { widgetTitle, colorScheme, allowedServicesJson, customCss } = req.body;
    const config = await BookingAppointmentService.configureWidget(tenantId, widgetTitle, colorScheme, allowedServicesJson, customCss);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});
