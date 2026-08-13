# GBS Phase 6 Release Notes — Enterprise Customer Portal

## Version 6.0.0 — Major Architectural Release

### Highlights

1. **Configurable Customer Dashboard**: 18 customizable drag-and-drop widgets, saved layout presets, real-time metrics, and CSV export.
2. **Account & Security Governance**: Profile details, address management, MFA TOTP setup, connected devices, and login history.
3. **Subscribed Services Management**: Purchased services catalog, renewal tracking, upgrade/downgrade requests, and add-on recommendations.
4. **Orders & Tracking Subsystem**: Order history, status tracking, shipment tracking IDs, and invoice downloads.
5. **Appointments & Virtual Meetings**: Availability lookup, appointment booking, rescheduling, cancellation, and meeting video link integration.
6. **Google Business Profile Customer Actions**: Review submission, photo uploads, business updates, product/service browsing, and AI response previews.
7. **Omnichannel Messaging Hub**: Multi-channel messaging across Chat, Email, SMS, WhatsApp, and Push notifications.
8. **Support Center & Knowledge Base**: Support ticket creation, live chat, knowledge base search, and FAQ lookup.
9. **Specialized Customer AI Assistant Studio**: 7 specialized AI tool engines (Help, Knowledge, FAQ, Document, Recommendation, Appointment, Support) with voice & text command runners.
10. **Document Vault**: Storage repository for contracts, agreements, invoices, receipts, reports, and customer uploads.
11. **Payments & Auto-Billing**: Invoice payment processing, online card payments, auto-pay methods, and receipt downloads.
12. **Customer Reports & Analytics**: 7 report domains with PDF/CSV export.
13. **Notifications Preferences**: Multi-channel delivery preference management.
14. **Enterprise Command Search**: Global `Ctrl+K` command palette search across 8 resource types.
15. **Customer Mobile App Parity**: Expo / React Native app featuring biometric login, offline cache mode, push notifications, deep links, QR code support, camera access, and location services.

---

### Verification & Compliance
- Automated API Test Suite (`phase6CustomerPortal.test.ts`): 100% Passed.
- Database Schema Integrity: Extended with `CustomerOrder`, `CustomerAppointment`, `CustomerQuotation`, `CustomerInvoice`, `CustomerLoyalty`, and `CustomerDocument`.
- Multi-Tenant Boundary Scoping & RBAC Governance: Validated.
