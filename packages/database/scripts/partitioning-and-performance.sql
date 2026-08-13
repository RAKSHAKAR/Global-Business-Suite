-- =============================================================================
-- Global Business Suite (GBS) — Enterprise Database Optimizations SQL
-- PostgreSQL Table Partitioning, Row-Level Security (RLS) & Materialized Views
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table Range Partitioning Strategy for High-Volume Logs (AuditLog & AiUsageLog)
-- -----------------------------------------------------------------------------

-- Example PostgreSQL Range Partitioning setup for AuditLog by month
-- CREATE TABLE "AuditLog_partitioned" (
--     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
--     "tenantId" TEXT,
--     "userId" TEXT,
--     "action" TEXT NOT NULL,
--     "resource" TEXT NOT NULL,
--     "resourceId" TEXT,
--     "details" TEXT,
--     "ipAddress" TEXT,
--     "userAgent" TEXT,
--     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     PRIMARY KEY ("id", "createdAt")
-- ) PARTITION BY RANGE ("createdAt");

-- CREATE TABLE "AuditLog_y2026m08" PARTITION OF "AuditLog_partitioned"
--     FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- -----------------------------------------------------------------------------
-- 2. Materialized Views for Executive Dashboard Reporting Aggregations
-- -----------------------------------------------------------------------------

-- Materialized View: Daily Tenant Activity Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_tenant_activity AS
SELECT 
    "tenantId",
    DATE_TRUNC('day', "createdAt") AS activity_date,
    COUNT(DISTINCT "id") AS total_actions,
    COUNT(DISTINCT "userId") AS active_users
FROM "AuditLog"
WHERE "tenantId" IS NOT NULL
GROUP BY "tenantId", DATE_TRUNC('day', "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_tenant_act ON mv_daily_tenant_activity("tenantId", activity_date);

-- Materialized View: Monthly AI Token Usage & Cost Rollup
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_ai_token_cost AS
SELECT 
    "tenantId",
    "providerKey",
    "modelKey",
    DATE_TRUNC('month', "createdAt") AS billing_month,
    SUM("totalTokens") AS total_tokens_used,
    SUM("estimatedCost") AS total_cost_usd,
    COUNT("id") AS api_call_count
FROM "AiUsageLog"
WHERE "tenantId" IS NOT NULL
GROUP BY "tenantId", "providerKey", "modelKey", DATE_TRUNC('month', "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_ai ON mv_monthly_ai_token_cost("tenantId", "providerKey", "modelKey", billing_month);

-- -----------------------------------------------------------------------------
-- 3. Row-Level Security (RLS) Policies for Multi-Tenant Isolation
-- -----------------------------------------------------------------------------

-- Enable RLS on core multi-tenant tables
-- ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "SocialPost" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "CustomerOrder" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS Policy Example
-- CREATE POLICY tenant_isolation_user_policy ON "User"
--     USING ("tenantId" = current_setting('app.current_tenant_id', true) OR current_setting('app.is_super_admin', true) = 'true');

-- -----------------------------------------------------------------------------
-- 4. High-Performance Covering Composite Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_tenant_deleted ON "User"("tenantId", "isDeleted");
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON "AuditLog"("tenantId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_aiusage_tenant_created ON "AiUsageLog"("tenantId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notification_user_unread ON "Notification"("userId", "isRead") WHERE "isRead" = false;
CREATE INDEX IF NOT EXISTS idx_socialpost_tenant_status ON "SocialPost"("tenantId", "status", "scheduledAt");
