# Global Business Suite (GBS) — CRM, Sales, Marketing & Customer Success Architecture

**Version**: 1.0.0  
**Phase**: Phase 13 Enterprise Platform Release  

---

## 1. System Topology & Core Domain Architecture

GBS Phase 13 introduces a fully integrated Enterprise CRM, Sales Pipeline, Omnichannel Marketing Engine, Customer Success Matrix, and AI Sales Intelligence layer across all four portals and mobile applications.

```
                   ┌─────────────────────────────────────────┐
                   │    GBS Multi-Tenant API Gateway          │
                   │     (/api/v1/crm/* & /api/v1/admin/*)   │
                   └────────────────────┬────────────────────┘
                                        │
     ┌──────────────────┬───────────────┼───────────────┬──────────────────┐
     │                  │               │               │                  │
┌────▼──────┐     ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐     ┌──────▼─────┐
│  Leads    │     │ Accounts  │   │ Sales     │   │ Marketing │     │ Customer   │
│ Engine    │     │ & Contacts│   │ Pipelines │   │ Engine    │     │ Success    │
└────┬──────┘     └─────┬─────┘   └─────┬─────┘   └─────┬─────┘     └──────┬─────┘
     │                  │               │               │                  │
     └──────────────────┴───────────────┼───────────────┴──────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────┐
                 │     Prisma ORM & PostgreSQL / SQLite DB     │
                 │  (Multi-Tenant Isolation via tenantId FK)   │
                 └─────────────────────────────────────────────┘
```

---

## 2. Database Models & Schema Extensions

Phase 13 introduces 12 new enterprise models and enriches existing CRM entities:

- **`CrmLead`**: Comprehensive lead capture, AI lead score (0-100), duplicate detection, conversion tracking.
- **`CrmLeadRoutingRule`**: Territory, round-robin, and load-balanced automated lead distribution rules.
- **`CrmLeadScoringRule`**: Behavioral, demographic, and firmographic scoring criteria.
- **`CrmLeadCaptureForm`**: Web form embed builder with submission metrics and CAPTCHA protection.
- **`CrmAccount` & `CrmContact`**: B2B Organization hierarchy, contact opt-in consent preferences (GDPR/TCPA/CAN-SPAM).
- **`CrmPipeline` & `CrmStage`**: Multi-pipeline stage definition with win probabilities.
- **`CrmOpportunity`**: Sales deal tracking with AI win/loss insights, expected close dates, and competitor tracking.
- **`CrmActivity`**: Omnichannel communication and activity logs (Calls, Meetings, Emails, WhatsApp, SMS, Tasks).
- **`MarketingAudienceSegment` & `MarketingJourney`**: Dynamic audience rule builder and visual automation flowchart execution.
- **`MarketingCampaignAbVariant`**: A/B testing subject and content variant tracking.
- **`CustomerHealthScore`, `CustomerSuccessPlan`, `CustomerFeedback`, `CustomerRenewalUpsell`**: Predictive health index, onboarding milestones, NPS/CSAT feedback, expansion MRR pipeline.
- **`CrmDocument`**: Quotes, Contracts, Proposals, Agreements with cryptographic Digital Signatures.

---

## 3. Multi-Tenant Isolation & Security Governance

1. **Tenant Boundaries**: Every record in `CrmLead`, `CrmAccount`, `CrmContact`, `CrmPipeline`, `CrmOpportunity`, `MarketingCampaign`, `CustomerHealthScore`, and `CrmDocument` is strictly bound to `tenantId`.
2. **Role-Based Access Control (RBAC)**: Enforces granular permissions (`crm:manage`, `leads:manage`, `marketing:manage`, `customer_success:manage`, `documents:manage`).
3. **Audit Logging**: All record creations, stage movements, conversions, and document signatures emit real-time entries to `AuditLog`.
