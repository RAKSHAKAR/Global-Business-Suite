import express from "express";
import request from "supertest";
import { customerPortalRouter } from "../../../routes/v1/customerPortal";
import { partnerPortalRouter } from "../../../routes/v1/partnerPortal";

const app = express();
app.use(express.json());
app.use("/api/v1/customer", customerPortalRouter);
app.use("/api/v1/partner", partnerPortalRouter);

describe("GBS Phase 7 – Enterprise Mobile Applications API Contract Test Suite", () => {
  it("rejects mobile profile access without a bearer session", async () => {
    const res = await request(app)
      .get("/api/v1/customer/profile")
      .set("X-Cert-Pinning", "verified")
      .set("User-Agent", "GBSMobile/1.0 (iOS)");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("MISSING_TOKEN");
  });

  it("does not expose Partner Mobile review automation without authentication", async () => {
    const res = await request(app)
      .post("/api/v1/partner/reviews/auto-reply-all")
      .send({ locationId: "loc_123" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("MISSING_TOKEN");
  });

  it("does not expose Customer Mobile AI tools without authentication", async () => {
    const res = await request(app)
      .post("/api/v1/customer/ai/assistant")
      .send({ toolType: "APPOINTMENT", query: "When is my next meeting?" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("MISSING_TOKEN");
  });

  it("does not accept Customer Mobile document metadata without authentication", async () => {
    const res = await request(app)
      .post("/api/v1/customer/documents/upload")
      .send({ name: "ScannedReceipt.jpg", fileUrl: "https://gbs.com/scanned.jpg", fileSize: 102400 });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("MISSING_TOKEN");
  });

  it("does not expose customer search without authentication", async () => {
    const res = await request(app).get("/api/v1/customer/global-search?q=services");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("MISSING_TOKEN");
  });
});
