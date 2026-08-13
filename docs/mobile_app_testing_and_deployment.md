# Mobile App Testing & App Store Deployment Guide

This guide provides step-by-step instructions for testing, building, downloading, and publishing the three Expo / React Native mobile applications in the Global Business Suite (GBS) monorepo:

- **Admin Mobile** (`apps/admin-mobile`) — Port 8081
- **Partner Mobile** (`apps/partner-mobile`) — Port 8082
- **Customer Mobile** (`apps/customer-mobile`) — Port 8083

---

## 1. Local & Cross-Platform Testing Methods

### A. Testing on Web Browser (Expo Web)

Run mobile applications directly in your desktop browser for rapid UI iteration and responsive design testing.

```bash
# Start Admin Mobile on Web
pnpm --filter admin-mobile web --port 8081

# Start Partner Mobile on Web
pnpm --filter partner-mobile web --port 8082

# Start Customer Mobile on Web
pnpm --filter customer-mobile web --port 8083
```

- Open http://localhost:8081 (Admin), http://localhost:8082 (Partner), or http://localhost:8083 (Customer) in Chrome / Edge.
- Toggle Device Toolbar (`F12` -> `Ctrl+Shift+M`) to inspect mobile viewports.

---

### B. Testing on Physical Devices (Expo Go App)

1. **Install Expo Go App** from the App Store (iOS) or Google Play Store (Android).
2. **Ensure phone and computer share the same local Wi-Fi network.**
3. **Start Expo Dev Server**:
   ```bash
   pnpm --filter customer-mobile start
   ```
4. **Scan QR Code**:
   - **Android**: Open Expo Go app and tap **Scan QR Code**.
   - **iOS**: Open native **Camera App** on iPhone, point at terminal QR code, and tap **Open in Expo Go**.

---

### C. Testing on iOS Simulator & Android Emulator

```bash
# iOS Simulator (macOS + Xcode)
pnpm --filter customer-mobile ios

# Android Emulator (Android Studio)
pnpm --filter customer-mobile android
```

---

## 2. App Store Deployment Prerequisites

1. **Apple Developer Account** (For iOS / App Store): $99/year enrollment.
2. **Google Play Console Account** (For Android / Google Play): $25 one-time fee.
3. **Expo Account**: Register at [expo.dev](https://expo.dev) for EAS builds and OTA updates.

---

## 3. Building Production Apps (`.ipa` & `.aab`) via EAS

Install EAS CLI and initialize project:

```bash
npm install -g eas-cli
eas login
cd apps/customer-mobile
eas project:init
```

### Build Commands:

```bash
# Build iOS (.ipa for TestFlight / App Store)
eas build --platform ios --profile production

# Build Android (.aab for Google Play Store)
eas build --platform android --profile production

# Build Android Standalone APK (Direct Sideloading)
eas build --platform android --profile preview
```

---

## 4. App Store Submission & OTA Live Updates

### Automated Submit

```bash
# Submit to TestFlight / App Store
eas submit --platform ios

# Submit to Google Play Console
eas submit --platform android
```

### Over-The-Air (OTA) Instant Updates

For JS/React component updates without waiting for app store re-review:

```bash
eas update --auto --branch production
```

---

## 5. Quick Commands Cheat Sheet

| Task                                  | Command                                             |
| :------------------------------------ | :-------------------------------------------------- |
| **Run Admin Mobile Web Mode**         | `pnpm --filter admin-mobile web --port 8081`        |
| **Run Partner Mobile Web Mode**       | `pnpm --filter partner-mobile web --port 8082`      |
| **Run Customer Mobile Web Mode**      | `pnpm --filter customer-mobile web --port 8083`     |
| **Run Expo Go Dev Mode**              | `pnpm --filter customer-mobile start`               |
| **Run iOS Simulator**                 | `pnpm --filter customer-mobile ios`                 |
| **Run Android Emulator**              | `pnpm --filter customer-mobile android`             |
| **Build Production iOS (`.ipa`)**     | `eas build --platform ios --profile production`     |
| **Build Production Android (`.aab`)** | `eas build --platform android --profile production` |
| **Publish OTA Update**                | `eas update --auto --branch production`             |
