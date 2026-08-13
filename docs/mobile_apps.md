# Mobile Ecosystem Architecture (Phase 7 Enterprise Edition)

Alongside the web interfaces, Global Business Suite (GBS) provides a suite of three enterprise-grade native mobile applications built using **React Native** and **Expo**. This cross-platform architecture supports native iOS (`.ipa`), Android (`.aab` / `.apk`), and Web mode execution with full feature parity across all portal tiers.

---

## 1. Monorepo Applications & Feature Parity Matrix

### 1. Admin Mobile (`apps/admin-mobile`)
- **Port (Expo Web):** `8081`
- **Target Audience:** Platform Owners and Super Admins.
- **Phase 7 Enterprise Capabilities:**
  - **System Metrics & Revenue**: Real-time revenue counters, tenant health, system uptime metrics, AI token allocations.
  - **Tenant Governance & RBAC**: Multi-tenant onboarding, status toggles, tier inspection, domain binding, white-label preview, and atomic permission audit checks.
  - **AI Engine Management**: Vendor API key management (OpenAI, Gemini, Anthropic, Cursor), model routing, and tenant quota rebalancing.
  - **GBP Overseer & Security**: Multi-tenant GBP location status, global review volume, certificate pinning (`X-Cert-Pinning`), root/jailbreak detection, and biometric authentication.
  - **App Releases & Voice Search**: Mobile binary release registry, mandatory update flags, global voice-activated search palette, and camera document scanner.

### 2. Partner Mobile (`apps/partner-mobile`)
- **Port (Expo Web):** `8082`
- **Target Audience:** SaaS Agency Partners & Account Managers.
- **Phase 7 Enterprise Capabilities:**
  - **Partner Workspace Dashboard**: 16 metric cards, saved layout presets, real-time lead updates, GBP rating summary.
  - **GBP 14-Subsystem Suite**: Multi-location sync, Google Posts builder, Review monitoring, 1-Tap AI Reply generator, Products & Services catalog, Q&A responder, and Daily Insights charts.
  - **Omnichannel Social Publisher**: 8 platforms integrated (FB, IG, LinkedIn, X, Threads, YT, TikTok, Pinterest), multi-channel post composer, AI caption generator, campaign calendar.
  - **CRM & Lead Pipeline**: Client directory, lead status board, contact details, interaction history timeline, and QR business card scanner.
  - **AI Assistant Studio**: 8 specialized AI engines (Content, Image, Marketing, Advisor, SEO, Review, Campaign, Analytics), prompt library, voice command interface.
  - **Marketing Workflows & Tasks**: Email/SMS/WhatsApp/Push campaign creator, team calendar, virtual session link generator, task board, and media storage vault.

### 3. Customer Mobile (`apps/customer-mobile`)
- **Port (Expo Web):** `8083`
- **Target Audience:** End-clients & Local Business Owners.
- **Phase 7 Enterprise Capabilities:**
  - **Self-Service Dashboard**: Marketing score gauge, active services, order summary, loyalty points balance.
  - **Subscribed Services & Orders**: Service catalog, renewal dates, order tracking, itemized breakdown, tracking ID, invoice download.
  - **Appointments & Virtual Sessions**: Availability calendar, virtual meeting booking, rescheduling, video link launcher.
  - **7 Customer AI Tool Engines**: Help, Knowledge, FAQ, Document, Recommendation, Appointment, Support engines with Web Speech API voice runner.
  - **Document Vault & Hardware**: Encrypted PDF storage, invoices, receipts, uploaded files, camera document scanner.
  - **Payments & Security**: Invoice payment runner, saved cards, auto-pay toggle, Face ID biometric login, offline cache mode banner.

---

## 2. Shared Mobile Architecture & Security Services

- **Biometric Security Engine**: Native Face ID & Fingerprint sign-in integration (`expo-local-authentication`).
- **Offline Auto-Sync Engine**: Local data caching (`AsyncStorage`) and background action queueing (`syncQueueCount`) with optimistic UI updates and auto-sync retry on reconnect.
- **Design Tokens**: Dark Slate (`#0F172A`) and Light Slate (`#F8FAFC`) dynamic theme modes adhering to `gbs-design-system.css` tokens.
- **Hardware Abstraction**: Camera document scanner, QR/Barcode scanner, Microphone voice-to-text input, and GPS location services.

---

## 3. Development & Build Commands

- Launch dev server: `pnpm --filter <app-name> start`
- Launch in Expo Web mode: `pnpm --filter <app-name> web --port <port>`
- For building and store deployment instructions, refer to [mobile_app_testing_and_deployment.md](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/docs/mobile_app_testing_and_deployment.md).

