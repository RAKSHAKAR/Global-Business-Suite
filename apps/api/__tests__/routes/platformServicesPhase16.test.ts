/// <reference types="jest" />
import request from "supertest";
import { app as mainApp } from "../../src/index";

let authToken: string;
let createdWorkflowKey = `WF_TEST_${Date.now()}`;
let createdBackupId: string;

beforeAll(async () => {
  const res = await request(mainApp)
    .post("/api/v1/auth/login")
    .send({ email: "admin@enterprise.com", password: "Admin@1234!" });
  authToken = res.body.data?.token || res.body.token;
});

describe("Phase 16 Enterprise Platform Services, Automation & Operations Test Suite", () => {
  // ── 1. Centralized Notification Center (11 Channels) ───────────────────
  describe("Centralized Notification Center", () => {
    it("POST /api/v1/platform-services/notifications/send → 201 dispatches multi-channel notification", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/notifications/send")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          recipient: "user@enterprise.com",
          channel: "WHATSAPP",
          title: "Welcome {{name}}",
          body: "Your account is active. Code: {{code}}",
          variables: { name: "Alex", code: "9921" },
          fallbackChannel: "EMAIL",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notification.title).toBe("Welcome Alex");
      expect(response.body.data.notification.body).toContain("9921");
      expect(response.body.data.notification.channel).toBe("WHATSAPP");
    });

    it("GET /api/v1/platform-services/notifications/logs → 200 returns notification logs", async () => {
      const response = await request(mainApp)
        .get("/api/v1/platform-services/notifications/logs")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.logs)).toBe(true);
    });
  });

  // ── 2. Visual Workflow Engine ──────────────────────────────────────────
  describe("Visual Workflow Engine", () => {
    it("POST /api/v1/platform-services/workflows/definitions → 201 saves visual workflow", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/workflows/definitions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          key: createdWorkflowKey,
          name: "Partner Onboarding Automation",
          description: "Visual workflow with AI Risk Check & Approval",
          triggerType: "APPROVAL",
          nodes: [
            { id: "start", type: "TRIGGER", data: { event: "partner.registered" } },
            { id: "ai_risk", type: "AI_CHECK", data: { model: "risk-engine" } },
            { id: "approve", type: "APPROVAL_STEP", data: { role: "SUPER_ADMIN" } },
          ],
          edges: [
            { id: "e1", source: "start", target: "ai_risk" },
            { id: "e2", source: "ai_risk", target: "approve" },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.workflow.key).toBe(createdWorkflowKey);
      expect(response.body.data.workflow.version).toBe(1);
    });

    it("POST /api/v1/platform-services/workflows/execute → 200 executes visual workflow", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/workflows/execute")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          workflowKey: createdWorkflowKey,
          inputParams: { partnerId: "p_123" },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.execution.status).toBe("COMPLETED");
      expect(response.body.data.execution.nodeCount).toBe(3);
    });
  });

  // ── 3. Automation Engine & Queue Management ────────────────────────────
  describe("Automation Engine & Priority Queue", () => {
    it("POST /api/v1/platform-services/automation/jobs → 201 enqueues background job", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/automation/jobs")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          queueName: "HIGH",
          jobType: "BULK_MARKETING",
          payload: { campaignId: "camp_99" },
          priority: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.job.queueName).toBe("HIGH");
      expect(response.body.data.job.status).toBe("QUEUED");
    });

    it("POST /api/v1/platform-services/automation/jobs/process → 200 processes queued jobs", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/automation/jobs/process")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ queueName: "HIGH" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.processedCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 4. Integration Connectors ──────────────────────────────────────────
  describe("Integration Platform & Connectors", () => {
    it("POST /api/v1/platform-services/integrations/connectors → 201 registers connector", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/integrations/connectors")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          connectorKey: "ZAPIER",
          name: "Zapier Marketing Webhook",
          connectorType: "WEBHOOK",
          settings: { autoSync: true },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.connector.connectorKey).toBe("ZAPIER");
    });
  });

  // ── 5. Feature Flags & Hierarchical Evaluation ─────────────────────────
  describe("Feature Flags & Emergency Kill Switch", () => {
    it("POST /api/v1/platform-services/feature-flags/evaluate-hierarchical → 200 evaluates flag", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/feature-flags/evaluate-hierarchical")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ flagKey: "ADVANCED_ANALYTICS" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.flagKey).toBe("ADVANCED_ANALYTICS");
    });
  });

  // ── 6. System Monitoring & Observability ──────────────────────────────
  describe("System Monitoring Telemetry", () => {
    it("GET /api/v1/platform-services/monitoring/system-health → 200 returns full telemetry", async () => {
      const response = await request(mainApp)
        .get("/api/v1/platform-services/monitoring/system-health")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subsystems.database.status).toBe("CONNECTED");
    });
  });

  // ── 7. Security Operations ─────────────────────────────────────────────
  describe("Security Threat Logging", () => {
    it("POST /api/v1/platform-services/security-ops/log-threat → 201 records security threat", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/security-ops/log-threat")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ipAddress: "192.168.1.105",
          threatType: "SUSPICIOUS_LOGIN",
          severity: "HIGH",
          wasBlocked: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.threat.threatType).toBe("SUSPICIOUS_LOGIN");
    });
  });

  // ── 8. Backup & Disaster Recovery ──────────────────────────────────────
  describe("Automated Backup & DR Restore Simulation", () => {
    it("POST /api/v1/platform-services/backup-dr/trigger → 201 triggers automated backup", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/backup-dr/trigger")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ backupType: "FULL" });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.backup.backupType).toBe("FULL");
      createdBackupId = response.body.data.backup.id;
    });

    it("POST /api/v1/platform-services/backup-dr/restore-test → 200 simulates restore test", async () => {
      const response = await request(mainApp)
        .post("/api/v1/platform-services/backup-dr/restore-test")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ backupId: createdBackupId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.restoreTestStatus).toBe("PASSED");
    });
  });

  // ── 9. Enterprise Global Search ────────────────────────────────────────
  describe("Global Search Platform v2", () => {
    it("GET /api/v1/platform-services/search/global-v2?q=admin → 200 returns entity search results", async () => {
      const response = await request(mainApp)
        .get("/api/v1/platform-services/search/global-v2?q=admin")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.query).toBe("admin");
      expect(response.body.data.results).toBeDefined();
    });
  });
});
