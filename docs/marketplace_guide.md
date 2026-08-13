# Global Business Suite (GBS) — Marketplace Guide

## Overview

The GBS App & AI Marketplace empowers enterprise tenants, agencies, and partners to install pre-built applications, industry templates, AI prompt packs, autonomous agents, workflow templates, and low-code components.

## Categories

- **Business Applications**: Full-featured vertical solutions (e.g. IoT Sensor Asset Tracker, Healthcare Appointment Suite).
- **Extensions**: Connectors linking external software (e.g. Salesforce CRM, QuickBooks, SAP, Stripe).
- **AI Prompt Packs**: Curated prompt collections for marketing, sales, customer service, and local SEO.
- **AI Autonomous Agents**: Configurable agents for automated review responses, SEO auditing, and security threat mitigation.
- **Workflow & Dashboard Templates**: Visual flow definitions and KPI scorecard grids.

## Marketplace Management API

- `GET /api/v1/ecosystem/plugins` — Browse plugins & applications
- `POST /api/v1/ecosystem/plugins/install` — Install extension for active tenant
- `GET /api/v1/ecosystem/ai-marketplace/items` — Browse AI prompt packs & agents
