# Database Schema & Data Layer Technical Documentation

The platform utilizes a relational database managed via **Prisma ORM**. The central schema file is located in `packages/database/prisma/schema.prisma`.

---

## 1. Schema Overview

The database contains **158 Prisma schema models** categorized into domain subsystems:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     158 Prisma Schema Models                            │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ Core Tenant       │ Identity & Auth   │ Role-Based Access Control (RBAC)│
│ - Tenant          │ - User            │ - Role                          │
│ - WhiteLabelConfig│ - Session         │ - Permission                    │
│ - PlatformSetting │ - PasswordReset   │ - RolePermission                │
│                   │ - PasswordHistory │ - UserRole                      │
│                   │ - AuthProviderConf│                                 │
│                   │ - VerificationTok │                                 │
│                   │ - ProviderAccount │                                 │
│                   │ - MfaSecret       │                                 │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ CRM & Sales       │ Enterprise AI     │ Billing & Subscriptions         │
│ - Client          │ - AiProvider      │ - Plan                          │
│ - CrmLead         │ - AiModel         │ - Subscription                  │
│ - CrmLeadRouting  │ - AiAgent         │ - SubscriptionAddon             │
│ - CrmLeadScoring  │ - AiAgentExec     │ - Invoice                       │
│ - CrmLeadForm     │ - AiWorkflow      │ - InvoiceLineItem               │
│ - CrmAccount      │ - AiWorkflowRun   │ - Payment                       │
│ - CrmContact      │ - AiKnowledgeBase │ - PaymentGatewayConfig          │
│ - CrmPipeline     │ - AiDocument      │ - SavedPaymentMethod            │
│ - CrmStage        │ - AiDocumentChunk │ - Refund                        │
│ - CrmOpportunity  │ - AiGovernance    │ - TaxRule                       │
│ - CrmActivity     │ - AiGovernanceLog │ - TaxExemption                  │
│ - CrmDocument     │ - AiUsageLog      │ - Coupon                        │
│                   │ - AiEmbedding     │ - CouponRedemption              │
│                   │ - TenantAiConfig  │ - UsageRecord                   │
│                   │ - PromptTemplate  │ - EnterpriseLicense             │
│                   │                   │ - LicenseActivation             │
│                   │                   │ - PaymentWebhookLog             │
│                   │                   │ - BillingAddon                  │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ Social & Marketing│ GBP Engine        │ Platform Services & Ops         │
│ - SocialPost      │ - Location        │ - CentralNotificationLog        │
│ - SocialPostVer   │ - Review          │ - NotificationTemplate          │
│ - SocialPostPlat  │ - GbpAccount      │ - Notification                  │
│ - SocialChannel   │ - GbpLocationGroup│ - VisualWorkflowDefinition      │
│ - MediaFolder     │ - GbpPost         │ - VisualWorkflowExecution       │
│ - SocialMediaAsset│ - GbpProduct      │ - BackgroundJobQueue            │
│ - SocialEngageInb │ - GbpService      │ - DomainEventLog                │
│ - SocialMessage   │ - GbpMedia        │ - IntegrationConnectorConfig    │
│ - SocialComment   │ - GbpQuestion     │ - FeatureFlag                   │
│ - SocialListenMon │ - GbpAnswer       │ - ApprovalWorkflow              │
│ - SocialMention   │ - GbpInsight      │ - ApprovalStep                  │
│ - SocialCompetitor│ - GbpMessage      │ - ApprovalRequest               │
│ - SocialAnalytics │ - GbpPostTemplate │ - AutomationRule                │
│ - AiContent       │ - GbpReviewReply  │ - SecurityThreatLog             │
│ - MarketingSegment│                   │ - BackupRestoreLog              │
│ - MarketingJourney│                   │ - BackupLog                     │
│ - MarketingCamAB  │                   │ - SearchIndexMetadata           │
│ - MarketingCam    │                   │ - SavedSearch                   │
│ - CustomerHealth  │                   │ - StorageBucket                 │
│ - CustomerPlan    │                   │ - ApiKey                        │
│ - CustomerFeedback│                   │ - WebhookSubscription           │
│ - CustomerUpsell  │                   │ - DashboardLayout               │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ Support & KB      │ System & Logs     │ Mobile, Org & Master Data       │
│ - Ticket          │ - AuditLog        │ - AppRelease                    │
| `AiUsageLog` | AI Analytics | Detailed log of every completion call (tokens, latency, model, cost) |
| `PromptTemplate` | Prompt Store | Prompt library with categories, variable placeholders, and approvals |

---

## 3. Multi-Tenant Scoping

All data models maintain strict multi-tenant boundary scoping via `tenantId` field indexing (`@@index([tenantId])`). System-wide global templates and default configurations store `tenantId: null`.

---

## 4. Complete Prisma Schema Model Registry (179 Models)

The following models are declared and enforced in `packages/database/prisma/schema.prisma`:

- **Core & Multi-Tenancy**: `Tenant`, `WhiteLabelConfig`, `PlatformSetting`, `Organization`, `Branch`, `Department`, `Team`, `UserGroup`, `Country`, `State`, `City`, `Currency`, `Language`, `TaxRate`, `BusinessCategory`.
- **Identity, Authentication & IAM**: `User`, `Session`, `PasswordResetToken`, `PasswordHistory`, `AuthProviderConfig`, `VerificationToken`, `ProviderAccount`, `MfaSecret`, `LoginHistory`, `Device`, `ApiKey`.
- **Role-Based Access Control (RBAC)**: `Role`, `Permission`, `RolePermission`, `UserRole`.
- **Billing & Subscriptions**: `Plan`, `Subscription`, `SubscriptionAddon`, `EnterpriseLicense`, `LicenseActivation`, `PaymentGatewayConfig`, `SavedPaymentMethod`, `Invoice`, `InvoiceLineItem`, `Payment`, `Refund`, `TaxRule`, `TaxExemption`, `Coupon`, `CouponRedemption`, `UsageRecord`, `PaymentWebhookLog`, `BillingAddon`.
- **CRM & Customer Operations**: `Client`, `CrmLead`, `CrmLeadRoutingRule`, `CrmLeadScoringRule`, `CrmLeadCaptureForm`, `CrmAccount`, `CrmContact`, `CrmPipeline`, `CrmStage`, `CrmOpportunity`, `CrmActivity`, `CrmDocument`, `CustomerHealthScore`, `CustomerSuccessPlan`, `CustomerFeedback`, `CustomerRenewalUpsell`, `CustomerOrder`, `CustomerAppointment`, `CustomerQuotation`, `CustomerInvoice`, `CustomerLoyalty`, `CustomerDocument`.
- **Social Media & Omnichannel Marketing**: `SocialPost`, `SocialPostVersion`, `SocialPostPlatformResult`, `SocialChannel`, `MediaFolder`, `SocialMediaAsset`, `SocialEngagementInbox`, `SocialMessage`, `SocialComment`, `SocialListeningMonitor`, `SocialMention`, `SocialCompetitor`, `SocialAnalyticsSnapshot`, `AiContent`, `MarketingAudienceSegment`, `MarketingJourney`, `MarketingCampaignAbVariant`, `MarketingCampaign`, `CalendarEvent`, `TaskItem`, `MediaAsset`, `ScheduledReport`.
- **Google Business Profile (GBP)**: `GbpAccount`, `GbpLocationGroup`, `GbpPost`, `GbpProduct`, `GbpService`, `GbpMedia`, `GbpQuestion`, `GbpAnswer`, `GbpInsight`, `GbpMessage`, `GbpPostTemplate`, `GbpReviewReplyTemplate`, `Location`, `Review`.
- **AI Platform, Agents & Governance**: `AiProvider`, `AiModel`, `TenantAiConfig`, `PromptTemplate`, `AiEmbedding`, `AiAgent`, `AiAgentExecution`, `AiWorkflow`, `AiWorkflowRun`, `AiKnowledgeBase`, `AiDocument`, `AiDocumentChunk`, `AiGovernancePolicy`, `AiGovernanceAuditLog`, `AiUsageLog`, `AutonomousAiAgentConfig`, `AutonomousAgentExecution`, `EnterpriseCopilotSession`, `EnterpriseCopilotMessage`, `VoiceAiInteraction`, `DocumentIntelligenceRecord`, `AiMarketplaceItem`.
- **Business Intelligence & Analytics**: `ReportDefinition`, `ReportExecutionLog`, `KpiDefinition`, `KpiHistory`, `BIAlertRule`, `DashboardDefinition`, `DashboardWidget`, `PredictiveModelSnapshot`, `BiIntegration`.
- **Platform Services, Security & System Logs**: `CentralNotificationLog`, `NotificationTemplate`, `Notification`, `VisualWorkflowDefinition`, `VisualWorkflowExecution`, `BackgroundJobQueue`, `DomainEventLog`, `IntegrationConnectorConfig`, `FeatureFlag`, `ApprovalWorkflow`, `ApprovalStep`, `ApprovalRequest`, `AutomationRule`, `SecurityThreatLog`, `BackupRestoreLog`, `BackupLog`, `SearchIndexMetadata`, `SavedSearch`, `StorageBucket`, `WebhookSubscription`, `DashboardLayout`, `Ticket`, `TicketMessage`, `KnowledgeBase`, `AuditLog`, `SystemLog`, `AuditChangeLog`, `AppRelease`.
- **Ecosystem, Marketplaces & Developers**: `PluginMarketplaceItem`, `TenantPluginInstallation`, `PluginReview`, `DeveloperApp`, `DeveloperWebhook`, `SdkDistributionSpec`, `LowCodeComponent`, `LowCodeExecution`.
- **Enterprise Innovation & Future Readiness**: `EnterpriseSearchDocumentIndex`, `EnterpriseCollaborationTeam`, `EnterpriseCollaborationMessage`, `IotDeviceTelemetry`, `BlockchainAuditRecord`, `DigitalTwinSimulation`.

---

*Updated for Phase 18 — Enterprise Innovation & Architecture Standardization*

