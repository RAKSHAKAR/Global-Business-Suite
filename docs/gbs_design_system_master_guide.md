# Global Business Suite (GBS) – Enterprise Design System & Theme Master Guide

> **Tagline:** _One Platform. Every Business. Unlimited Growth._  
> **Compliance:** WCAG 2.2 AA Compliant | Enterprise-Grade SaaS Architecture

---

## 1. Brand Identity & Visual Principles

The **Global Business Suite (GBS)** design system delivers a unified enterprise SaaS experience.

### Visual Design Rules

1. **Generous Whitespace:** Prioritize visual clarity over dense clutter.
2. **Rounded Geometry:** 8px–14px radius (`var(--gbs-radius-md)` / `var(--gbs-radius-lg)`).
3. **Subtle Glass & Depth:** Glassmorphism (`backdrop-filter: blur(12px)`) reserved for elevated overlays, modals, and sticky header bars.
4. **Micro-Animations:** Standardized 150ms–250ms cubic-bezier transitions for interactive states.

---

## 2. Design Tokens & Color Architecture (`packages/gbs-design-system.css`)

### Color Palette Matrix

| Token Name              | Hex Code / Value       | Light Surface Usage             | Dark Surface Usage   |
| :---------------------- | :--------------------- | :------------------------------ | :------------------- |
| `--gbs-color-primary`   | `#2563EB` (Royal Blue) | Primary CTAs, Active Tabs       | Primary Highlights   |
| `--gbs-color-secondary` | `#4F46E5` (Indigo)     | Accents, AI Features            | Secondary CTAs       |
| `--gbs-color-success`   | `#10B981` (Emerald)    | Positive Metrics, Active Status | Active Badges        |
| `--gbs-color-warning`   | `#F59E0B` (Amber)      | Warnings, Pending Workflows     | Warning Alerts       |
| `--gbs-color-danger`    | `#EF4444` (Red)        | Errors, Deletion CTAs           | Critical Alerts      |
| `--gbs-bg-page`         | `#F8FAFC` / `#0F172A`  | Main Light Page Background      | Main Dark Page BG    |
| `--gbs-bg-surface`      | `#FFFFFF` / `#1E293B`  | Card & Panel BG                 | Dark Card & Panel BG |
| `--gbs-text-primary`    | `#111827` / `#F8FAFC`  | Primary Headings & Body         | Dark Primary Text    |
| `--gbs-text-secondary`  | `#6B7280` / `#94A3B8`  | Subtitles & Descriptions        | Dark Subtitles       |
| `--gbs-border-color`    | `#E5E7EB` / `#334155`  | Card Borders & Dividers         | Dark Borders         |

---

## 3. Dark & Light Mode Theme Implementation

Theme preference is applied via `data-theme` attribute on the root `<html>` element:

```html
<!-- Light Mode -->
<html lang="en" data-theme="light">
  <!-- Dark Mode -->
  <html lang="en" data-theme="dark" class="dark"></html>
</html>
```

CSS custom variables automatically swap values based on `data-theme` or `.dark` class.

---

## 4. Integration Code Snippet (Globals Import)

To apply GBS styles in any app, import the central stylesheet in your root `globals.css`:

```css
/* apps/<app-name>/app/globals.css */
@import "../../../packages/gbs-design-system.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```
