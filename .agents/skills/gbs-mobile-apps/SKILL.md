---
name: gbs-mobile-apps
description: Domain skill for GBS Mobile Apps (Admin, Partner, Customer) using Expo and React Native.
---

# GBS Mobile Apps Skill (Expo / React Native)

## Core Principles
1. **Cross-Platform Consistency**: Applications built in `apps/admin-mobile`, `apps/partner-mobile`, and `apps/customer-mobile` must share core design tokens and state patterns.
2. **React Native Web & Native**: Maintain compatibility across iOS, Android, and Web builds via Expo.
3. **Secure Storage & Auth**: Store JWT tokens securely using Expo SecureStore. Handle refresh token rotation cleanly.
4. **Offline Resilience**: Cache critical read data locally and queue offline actions where applicable.
5. **No Main Thread Blocking**: Keep UI renders smooth at 60 FPS; delegate heavy transformations to background workers or async logic.
