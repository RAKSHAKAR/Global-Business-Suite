/**
 * V1 Routes Isolated Test Suite
 * Tests billing and support routers directly with mocked auth
 */

import request from "supertest";
import express from "express";
import { app as mainApp } from "../../src/index";

// Use the main app (which imports real routes) and authenticate with admin token
let authToken: string;

beforeAll(async () => {
  // Get a real token from the seeded admin user
  const res = await request(mainApp)
    .post("/api/v1/auth/login")
    .send({ email: "admin@enterprise.com", password: "Admin@1234!" });
  authToken = res.body.data?.token || res.body.token;
});

describe("V1 API Endpoints", () => {
  describe("Billing API", () => {
    it("GET /api/v1/billing/invoices → 200 returns invoices array", async () => {
      const response = await request(mainApp)
        .get("/api/v1/billing/invoices")
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("GET /api/v1/billing/subscriptions → 200 returns subscriptions", async () => {
      const response = await request(mainApp)
        .get("/api/v1/billing/subscriptions")
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(200);
    });

    it("GET /api/v1/billing/plans → 200 returns plans array", async () => {
      const response = await request(mainApp)
        .get("/api/v1/billing/plans")
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("GET /api/v1/billing/invoices → 401 without token", async () => {
      const response = await request(mainApp).get("/api/v1/billing/invoices");
      expect(response.status).toBe(401);
    });
  });

  describe("Support API", () => {
    it("GET /api/v1/support/tickets → 200 returns tickets array", async () => {
      const response = await request(mainApp)
        .get("/api/v1/support/tickets")
        .set("Authorization", `Bearer ${authToken}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("GET /api/v1/support/knowledge-base → 200 returns articles (no auth required)", async () => {
      const response = await request(mainApp).get(
        "/api/v1/support/knowledge-base",
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("GET /api/v1/support/tickets → 401 without token", async () => {
      const response = await request(mainApp).get("/api/v1/support/tickets");
      expect(response.status).toBe(401);
    });
  });
});
