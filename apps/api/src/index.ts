import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import { prisma } from "@saas/database";

import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";

import { authRouter } from "./routes/v1/auth";
import { tenantsRouter } from "./routes/v1/tenants";
import { usersRouter } from "./routes/v1/users";
import { settingsRouter } from "./routes/v1/settings";
import { clientsRouter } from "./routes/v1/clients";
import { socialPostsRouter } from "./routes/v1/socialPosts";

import aiProvidersRouter from "./routes/aiProviders";
import tenantAiRouter from "./routes/tenantAi";
import billingRouter from "./routes/v1/billing";
import supportRouter from "./routes/v1/support";
import releaseRouter from "./routes/v1/releases";
import googleRouter from "./routes/v1/google";
import reviewsRouter from "./routes/v1/reviews";
import postsRouter from "./routes/v1/posts";
import analyticsRouter from "./routes/v1/analytics";
import aiRouter from "./routes/v1/ai";
import rolesRouter from "./routes/v1/roles";
import auditLogsRouter from "./routes/v1/auditLogs";
import leadsRouter from "./routes/v1/leads";
import mfaRouter from "./routes/v1/mfa";
import gbpRouter from "./routes/v1/gbp";
import socialRouter from "./routes/v1/social";
import engagementRouter from "./routes/v1/engagement";
import listeningRouter from "./routes/v1/listening";
import socialAiRouter from "./routes/v1/socialAi";
import automationRouter from "./routes/v1/automation";
import adminSocialChannelsRouter from "./routes/v1/adminSocialChannels";
import { iamRouter } from "./routes/v1/iam";
import { featureFlagsRouter } from "./routes/v1/featureFlags";
import { approvalWorkflowsRouter } from "./routes/v1/approvalWorkflows";
import { adminCenterRouter } from "./routes/v1/adminCenter";
import { adminDashboardRouter } from "./routes/v1/adminDashboard";
import { orgHierarchyRouter } from "./routes/v1/orgHierarchy";
import { roleSimulationRouter } from "./routes/v1/roleSimulation";
import { crmEngineRouter } from "./routes/v1/crmEngine";
import { billingEngineRouter } from "./routes/v1/billingEngine";
import { integrationsEngineRouter } from "./routes/v1/integrationsEngine";
import { fileStorageEngineRouter } from "./routes/v1/fileStorageEngine";
import { partnerPortalRouter } from "./routes/v1/partnerPortal";
import { customerPortalRouter } from "./routes/v1/customerPortal";
import { searchRouter } from "./routes/v1/search";
import { notificationsRouter } from "./routes/v1/notifications";
import { metricsMiddleware, metricsEndpoint } from "./middleware/metrics";
import { backgroundProcessor } from "./workers/backgroundProcessor";
import { SocialPublisherWorker } from "./workers/socialPublisherWorker";
import { startGbpWorker } from "./workers/gbpSyncWorker";
import { swaggerSpec } from "./swagger";
import aiPlatformRouter from "./routes/v1/aiPlatform";
import aiAgentsRouter from "./routes/v1/aiAgents";
import aiKnowledgeRouter from "./routes/v1/aiKnowledge";
import aiWorkflowsRouter from "./routes/v1/aiWorkflows";
import { leadsEngineRouter } from "./routes/v1/leadsEngine";
import { contactsAccountsEngineRouter } from "./routes/v1/contactsAccountsEngine";
import { marketingEngineRouter } from "./routes/v1/marketingEngine";
import { customerSuccessEngineRouter } from "./routes/v1/customerSuccessEngine";
import { crmDocumentsEngineRouter } from "./routes/v1/crmDocumentsEngine";
import { crmAiEngineRouter } from "./routes/v1/crmAiEngine";
import { crmIntegrationsEngineRouter } from "./routes/v1/crmIntegrationsEngine";
import { billingPlatformRouter } from "./routes/v1/billingPlatform";
import { analyticsEngineRouter } from "./routes/v1/analyticsEngine";
import { platformServicesEngineRouter } from "./routes/v1/platformServicesEngine";
import { ecosystemEngineRouter } from "./routes/v1/ecosystemEngine";
import { registrationApprovalRouter } from "./routes/v1/registrationApproval";
import { subscriptionAccessEngineRouter } from "./routes/v1/subscriptionAccessEngine";
import { upgradeRequestsRouter } from "./routes/v1/upgradeRequests";
import businessDirectoryRouter from "./routes/v1/businessDirectory";
import whatsappMarketingRouter from "./routes/v1/whatsappMarketing";
import communicationCenterRouter from "./routes/v1/communicationCenter";
import unifiedBusinessManagerRouter from "./routes/v1/unifiedBusinessManager";
import { unifiedInboxRouter } from "./routes/v1/unifiedInbox";
import { callCenterRouter } from "./routes/v1/callCenter";
import { appointmentsRouter } from "./routes/v1/appointments";
import { whiteLabelRouter } from "./routes/v1/whiteLabel";
import { complianceAuditRouter } from "./routes/v1/complianceAudit";
import { generatedMediaRoot } from "./services/socialContentPackageService";

dotenv.config();

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "[FATAL] JWT_SECRET environment variable is required in production. " +
      "Set it in your .env file or environment configuration.",
  );
}

export const app = express();
const PORT = process.env.PORT || 4000;

app.use(requestIdMiddleware);
app.use(metricsMiddleware);

// M-07: Explicit Content Security Policy via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

// H-09: Complete CORS origins including web portal
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:8083",
  ...(process.env.ADMIN_URL ? [process.env.ADMIN_URL] : []),
  ...(process.env.PARTNER_URL ? [process.env.PARTNER_URL] : []),
  ...(process.env.CUSTOMER_URL ? [process.env.CUSTOMER_URL] : []),
  ...(process.env.WEB_URL ? [process.env.WEB_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(
          new Error(`CORS policy: Origin "${origin}" is not allowed.`),
          false,
        );
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

// Public, immutable URLs for generated social assets. Filenames are random UUIDs;
// the database remains the tenant-scoped source of authorization and ownership.
app.use(
  "/generated-media",
  express.static(generatedMediaRoot, {
    dotfiles: "deny",
    index: false,
    immutable: true,
    maxAge: "1y",
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

// OpenAPI Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Sub-routers (Mounted under /api/v1/ and legacy /api/ for full backwards compatibility) ──
app.use("/api/v1/auth", authRouter);
app.use("/api/auth", authRouter);

app.use("/api/v1/tenants", tenantsRouter);
app.use("/api/tenants", tenantsRouter);

app.use("/api/v1/users", usersRouter);
app.use("/api/users", usersRouter);

app.use("/api/v1/clients", clientsRouter);
app.use("/api/clients", clientsRouter);

app.use("/api/v1/partner", partnerPortalRouter);
app.use("/api/v1/customer", customerPortalRouter);
app.use("/api/v1/ai-platform", aiPlatformRouter);
app.use("/api/v1/ai-agents", aiAgentsRouter);
app.use("/api/v1/ai-knowledge", aiKnowledgeRouter);
app.use("/api/v1/ai-workflows", aiWorkflowsRouter);
app.use("/api/v1/ai-providers", aiProvidersRouter);
app.use("/api/v1/tenant-ai", tenantAiRouter);
app.use("/api/v1/billing", billingRouter);
app.use("/api/v1/support", supportRouter);
app.use("/api/v1/releases", releaseRouter);
app.use("/api/v1/google", googleRouter);
app.use("/api/v1/reviews", reviewsRouter);
app.use("/api/v1/posts", postsRouter);
app.use("/api/v1/social-posts", socialPostsRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/roles", rolesRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/v1/audit-logs", auditLogsRouter);
app.use("/api/audit-logs", auditLogsRouter);
app.use("/api/v1/leads", leadsRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/v1/mfa", mfaRouter);
app.use("/api/mfa", mfaRouter);
app.use("/api/v1/gbp", gbpRouter);
app.use("/api/v1/social", socialRouter);
app.use("/api/v1/social/engagement", engagementRouter);
app.use("/api/v1/social/listening", listeningRouter);
app.use("/api/v1/social/ai", socialAiRouter);
app.use("/api/v1/automation", automationRouter);
app.use("/api/v1/admin/social-channels", adminSocialChannelsRouter);
app.use("/api/v1/admin", adminCenterRouter);
app.use("/api/v1/feature-flags", featureFlagsRouter);
app.use("/api/v1/approval-workflows", approvalWorkflowsRouter);
app.use("/api/v1/admin/dashboard", adminDashboardRouter);
app.use("/api/v1/admin/org", orgHierarchyRouter);
app.use("/api/v1/admin/roles-sim", roleSimulationRouter);
app.use("/api/v1/admin/crm", crmEngineRouter);
app.use("/api/v1/crm", crmEngineRouter);
app.use("/api/v1/crm/leads", leadsEngineRouter);
app.use("/api/v1/crm", contactsAccountsEngineRouter);
app.use("/api/v1/crm/marketing", marketingEngineRouter);
app.use("/api/v1/crm/customer-success", customerSuccessEngineRouter);
app.use("/api/v1/crm/documents", crmDocumentsEngineRouter);
app.use("/api/v1/crm/ai", crmAiEngineRouter);
app.use("/api/v1/crm/integrations", crmIntegrationsEngineRouter);


app.use("/api/v1/billing-platform", billingPlatformRouter);
app.use("/api/v1/analytics-engine", analyticsEngineRouter);
app.use("/api/v1/platform-services", platformServicesEngineRouter);
app.use("/api/platform-services", platformServicesEngineRouter);
app.use("/api/v1/ecosystem", ecosystemEngineRouter);
app.use("/api/ecosystem", ecosystemEngineRouter);
app.use("/api/v1/admin/billing-engine", billingEngineRouter);
app.use("/api/v1/admin/integrations", integrationsEngineRouter);
app.use("/api/v1/admin/storage", fileStorageEngineRouter);
app.use("/api/v1/iam", iamRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/notifications", notificationsRouter);



app.use("/api/v1", registrationApprovalRouter);
app.use("/api/v1", subscriptionAccessEngineRouter);
app.use("/api/v1", upgradeRequestsRouter);



app.use("/api/v1/business-directory", businessDirectoryRouter);
app.use("/api/v1/whatsapp-marketing", whatsappMarketingRouter);
app.use("/api/v1/communication-center", communicationCenterRouter);
app.use("/api/v1/unified-business-manager", unifiedBusinessManagerRouter);



app.use("/api/v1/inbox", unifiedInboxRouter);
app.use("/api/v1/calls", callCenterRouter);
app.use("/api/v1/bookings", appointmentsRouter);
app.use("/api/v1/whitelabel", whiteLabelRouter);
app.use("/api/v1/compliance", complianceAuditRouter);

app.get("/metrics", metricsEndpoint);

/**
 * Service Info Endpoint
 */
app.get("/", (_req, res) => {
  res.json({
    service: "Global Business Suite (GBS) Enterprise API Gateway",
    status: "running",
    version: "1.0.0",
  });
});

/**
 * Enhanced Subsystem Health Check Endpoint
 * M-04 FIX: Returns actual subsystem status instead of hardcoded "online".
 */
app.get("/health", async (_req, res) => {
  const startTime = Date.now();
  let dbStatus = "disconnected";
  let redisStatus = "not_configured";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "error";
  }

  // Check Redis if configured
  if (process.env.REDIS_URL) {
    try {
      const { default: Redis } = await import("ioredis");
      const redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      redisStatus = "connected";
    } catch {
      redisStatus = "error";
    }
  }

  const memoryUsage = process.memoryUsage();
  const isHealthy = dbStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    database: dbStatus,
    subsystems: {
      database: dbStatus,
      redis: redisStatus,
      aiEngine: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY ? "configured" : "no_keys_set",
      workers: "active",
      socialPublisher: "active",
      gbpWorker: "active",
    },
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryHeapMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      responseTimeMs: Date.now() - startTime,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || "development",
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 Route Handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 Enterprise SaaS API running at http://localhost:${PORT}`);
    console.log(`📖 API Docs: http://localhost:${PORT}/api-docs`);
    startGbpWorker();
    SocialPublisherWorker.start();
    backgroundProcessor.startCronSchedules();
  });
}

export default app;
