---
name: gbs-frontend-design-system
description: Domain skill for GBS Frontend Portals (Admin, Partner, Customer, Web) and the unified GBS CSS Design System.
---

# GBS Frontend & Design System Skill

## Core Principles
1. **Unified Design System**: Consume CSS tokens from `packages/gbs-design-system.css`. Never write inline un-themed styles or arbitrary pixel offsets.
2. **Component Reusability**: Check `apps/<portal>/components/` before writing new UI components. Extend existing components (`Captcha`, `Header`, `Footer`, `Sidebar`, `Button`, `Modal`) first.
3. **Responsive & Accessible**: Support mobile, tablet, and desktop breakpoints. Ensure WCAG AA accessibility compliance (aria-labels, keyboard navigation, color contrast).
4. **Tenant-Aware UI**: Adapt UI based on tenant branding, active role, and subscription tier.
5. **No Static Placeholders**: Use dynamic data from APIs or generated mock data adhering to system schemas.
