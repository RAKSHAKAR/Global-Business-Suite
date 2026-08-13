# Global Business Suite (GBS) — CRM & Customer Success REST API Specification

**Version**: 1.0.0  
**Base URL**: `http://localhost:4000/api/v1/crm`  

---

## Endpoint Reference

### 1. Lead Management
- `POST /crm/leads/capture` - Public lead capture form (Website / Social / GBP).
- `GET /crm/leads` - List leads (Supports `search`, `status`, `source`, `page`, `limit`).
- `GET /crm/leads/:id` - Lead details.
- `POST /crm/leads/:id/score` - Recalculate AI Lead Score.
- `POST /crm/leads/:id/convert` - Convert lead to B2B Account, Contact & Sales Opportunity.
- `GET /crm/leads/duplicates/detect` - Run duplicate detection.

### 2. Accounts & Contacts
- `GET /crm/accounts` - List accounts.
- `POST /crm/accounts` - Create B2B account.
- `GET /crm/contacts` - List contacts.
- `POST /crm/contacts` - Create contact.
- `PUT /crm/contacts/:id/preferences` - Update communication preferences.

### 3. Sales Pipeline & Opportunities
- `GET /admin/crm/pipelines` - Get pipelines and stages.
- `POST /admin/crm/pipelines` - Create pipeline.
- `POST /admin/crm/opportunities` - Create opportunity.
- `PUT /admin/crm/opportunities/:id/stage` - Update opportunity stage/status.
- `GET /admin/crm/analytics` - Pipeline analytics & win rates.

### 4. Marketing Automation
- `GET /crm/marketing/campaigns` - List campaigns.
- `POST /crm/marketing/campaigns` - Create campaign with A/B variants.
- `POST /crm/marketing/campaigns/:id/dispatch` - Dispatch campaign and calculate ROI.
- `GET /crm/marketing/segments` - List audience segments.
- `POST /crm/marketing/segments` - Create audience segment.
- `GET /crm/marketing/journeys` - List marketing journeys.
- `POST /crm/marketing/journeys` - Create marketing journey.

### 5. Customer Success & Health
- `GET /crm/customer-success/health` - List customer health scores.
- `POST /crm/customer-success/health/calculate` - Calculate health score & churn risk.
- `GET /crm/customer-success/plans` - List success plans.
- `POST /crm/customer-success/plans` - Create success plan.
- `GET /crm/customer-success/feedback` - List feedback responses.
- `POST /crm/customer-success/feedback` - Submit NPS/CSAT feedback.
- `GET /crm/customer-success/renewals` - List renewal pipeline.

### 6. Documents & Digital Signatures
- `GET /crm/documents` - List quotes, contracts, proposals.
- `POST /crm/documents` - Create quote/proposal.
- `POST /crm/documents/:id/sign` - Cryptographically sign document.
- `PUT /crm/documents/:id/status` - Update document status.

### 7. AI Platform Features
- `POST /crm/ai/score-lead` - Predictive lead scoring & next best action.
- `POST /crm/ai/deal-insights` - Deal win/loss insights.
- `POST /crm/ai/forecast` - Sales revenue forecasting.
- `POST /crm/ai/generate-email` - AI email writer.
- `POST /crm/ai/churn-prediction` - AI customer churn prediction.

### 8. GBP & Social Integrations
- `POST /crm/integrations/google-business/sync-leads` - Sync GBP messages into CRM leads.
- `POST /crm/integrations/social/sync-leads` - Sync Social Media ad leads into CRM leads.
