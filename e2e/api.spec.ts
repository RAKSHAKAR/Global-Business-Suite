import { expect, test } from "@playwright/test";
import { API_URL, credentials } from "./helpers/environment";

test.describe("API gateway contracts", () => {
  test("health reports a connected database within the local SLA", async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      status: "ok",
      database: "connected",
      subsystems: { database: "connected" },
    });
    expect(body.system.responseTimeMs).toBeLessThanOrEqual(200);
  });

  test("protected admin telemetry rejects an unauthenticated caller", async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/admin/dashboard/widgets`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("CAPTCHA verification rejects an incorrect answer", async ({ request }) => {
    const captchaResponse = await request.get(`${API_URL}/api/v1/auth/captcha`);
    expect(captchaResponse.status()).toBe(200);
    const captchaBody = await captchaResponse.json();
    const captcha = captchaBody.data || captchaBody;
    expect(captcha.audioText).toBeUndefined();
    expect(captcha.text).toBeUndefined();
    expect(captcha.audioUrl).toMatch(/^\/api\/v1\/auth\/captcha\/audio\//);

    const response = await request.post(`${API_URL}/api/v1/auth/captcha/verify-check`, {
      data: { captchaId: captcha.id, captchaToken: "__definitely_invalid__" },
    });
    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ valid: false });
  });

  test("text and image remain approval-gated before any provider publish", async ({ request }) => {
    test.setTimeout(90_000);
    const login = await request.post(`${API_URL}/api/v1/auth/login`, {
      data: credentials.partner,
    });
    expect(login.status()).toBe(200);
    const loginBody = await login.json();
    const token = loginBody.data?.token || loginBody.token;
    expect(token).toEqual(expect.any(String));
    const headers = { Authorization: `Bearer ${token}` };

    let postId = "";
    try {
      const generated = await request.post(`${API_URL}/api/v1/social/ai/content-package`, {
        headers,
        data: {
          topic: `Playwright coordinated package ${Date.now()}`,
          platforms: ["FACEBOOK"],
          tone: "professional",
        },
      });
      expect(generated.status()).toBe(201);
      const body = await generated.json();
      postId = body.post.id;
      expect(body).toMatchObject({
        success: true,
        nextAction: "REVIEW_AND_APPROVE",
        post: { status: "PENDING_APPROVAL", approvalStatus: "PENDING" },
        approvalRequest: { status: "PENDING" },
        media: { mimeType: "image/png", isAiGenerated: true },
        generation: { provider: "test", model: "gbs-e2e-content-package" },
      });
      expect(body.post.content).toContain("#ApprovalRequired");
      expect(JSON.parse(body.post.imageUrls)).toEqual([body.media.fileUrl]);

      const image = await request.get(body.media.fileUrl);
      expect(image.status()).toBe(200);
      expect(image.headers()["content-type"]).toContain("image/png");

      const blocked = await request.post(`${API_URL}/api/v1/social/posts/${postId}/publish`, { headers });
      expect(blocked.status()).toBe(409);
      await expect(blocked.json()).resolves.toMatchObject({ code: "SOCIAL_POST_APPROVAL_REQUIRED" });

      const approved = await request.post(`${API_URL}/api/v1/social/posts/${postId}/approve`, {
        headers,
        data: { comments: "Approved by Playwright regression test" },
      });
      expect(approved.status()).toBe(200);
      await expect(approved.json()).resolves.toMatchObject({ approvalStatus: "APPROVED" });

      const noChannel = await request.post(`${API_URL}/api/v1/social/posts/${postId}/publish`, { headers });
      expect(noChannel.status()).toBe(409);
      await expect(noChannel.json()).resolves.toMatchObject({ code: "SOCIAL_CHANNEL_REQUIRED" });
    } finally {
      if (postId) {
        await request.delete(`${API_URL}/api/v1/social/posts/${postId}`, { headers });
      }
    }
  });
});
