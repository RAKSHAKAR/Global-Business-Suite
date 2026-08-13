import {
  GoogleBusinessProfileError,
  GoogleBusinessProfileService,
  buildGoogleLocalPostPayload,
  decryptGoogleToken,
  encryptGoogleToken,
  signGoogleOAuthState,
  verifyGoogleOAuthState,
} from "../services/googleBusinessProfileService";

const ENCRYPTION_KEY = "test-google-token-encryption-key-with-more-than-32-characters";
const STATE_SECRET = "test-google-oauth-state-secret-with-more-than-32-characters";

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

function oauthClient(tokens: Record<string, any> = {}) {
  const client: any = {
    credentials: {},
    generateAuthUrl: jest.fn(() => "https://accounts.google.com/o/oauth2/v2/auth?state=signed"),
    getToken: jest.fn(async () => ({ tokens })),
    setCredentials: jest.fn((value) => {
      client.credentials = { ...value };
    }),
    getAccessToken: jest.fn(async () => ({ token: client.credentials.access_token })),
  };
  return client;
}

describe("Google Business Profile hardening", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
    process.env.GOOGLE_CLIENT_ID = "google-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret-value";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:4000/api/v1/google/callback";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  test("encrypts tokens with authenticated encryption and reads legacy plaintext", () => {
    const encrypted = encryptGoogleToken("refresh-token-value", ENCRYPTION_KEY);
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain("refresh-token-value");
    expect(decryptGoogleToken(encrypted, ENCRYPTION_KEY)).toBe("refresh-token-value");
    expect(decryptGoogleToken("legacy-plaintext-token", ENCRYPTION_KEY)).toBe("legacy-plaintext-token");
    expect(() => decryptGoogleToken(encrypted, `${ENCRYPTION_KEY}-wrong`)).toThrow(
      expect.objectContaining({ code: "GOOGLE_TOKEN_DECRYPTION_FAILED" }),
    );
  });

  test("accepts only signed, unexpired, tenant-bound OAuth state", () => {
    const signed = signGoogleOAuthState(
      { userId: "user-1", tenantId: "tenant-1" },
      { secret: STATE_SECRET, expiresInSeconds: 60 },
    );
    expect(verifyGoogleOAuthState(signed, { secret: STATE_SECRET })).toMatchObject({
      userId: "user-1",
      tenantId: "tenant-1",
      purpose: "CONNECT_GOOGLE_BUSINESS",
    });
    expect(() => verifyGoogleOAuthState(`${signed}tampered`, { secret: STATE_SECRET })).toThrow(
      expect.objectContaining({ code: "GOOGLE_OAUTH_STATE_INVALID" }),
    );

    const expired = signGoogleOAuthState(
      { userId: "user-1", tenantId: "tenant-1" },
      { secret: STATE_SECRET, expiresInSeconds: -1 },
    );
    expect(() => verifyGoogleOAuthState(expired, { secret: STATE_SECRET })).toThrow(
      expect.objectContaining({ code: "GOOGLE_OAUTH_STATE_INVALID" }),
    );
  });

  test("returns explicit configuration errors instead of mock OAuth credentials", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    const db = {
      platformSetting: { findMany: jest.fn(async () => []) },
      authProviderConfig: { findFirst: jest.fn(async () => null) },
    };
    const service = new GoogleBusinessProfileService({ db });

    await expect(service.getOAuthConfiguration()).rejects.toMatchObject({
      status: 503,
      code: "GOOGLE_OAUTH_NOT_CONFIGURED",
      details: {
        missing: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"],
      },
    });
  });

  test("exchanges offline OAuth tokens and persists discovered accounts, locations, and channel without exposing plaintext", async () => {
    process.env.GOOGLE_OAUTH_STATE_SECRET = STATE_SECRET;
    const exchanged = {
      access_token: "fresh-access-token",
      refresh_token: "offline-refresh-token",
      expiry_date: Date.now() + 3_600_000,
      scope: "https://www.googleapis.com/auth/business.manage openid email",
      token_type: "Bearer",
    };
    const oauth = oauthClient(exchanged);
    const providerUpsert = jest.fn(async ({ create, update }) => ({ id: "provider-link-1", ...(create || update) }));
    const accountUpsert = jest.fn(async ({ create, update }) => ({
      id: "gbp-account-1",
      tenantId: "tenant-1",
      googleAccountId: "accounts/123",
      ...(create || update),
    }));
    const channelUpsert = jest.fn(async ({ create, update }) => ({ id: "channel-1", ...(create || update) }));
    const locationUpsert = jest.fn(async ({ create, update }) => ({
      id: "location-1",
      tenantId: "tenant-1",
      googleLocationId: "locations/456",
      isSyncEnabled: false,
      ...(create || update),
    }));
    const db: any = {
      platformSetting: { findMany: jest.fn(async () => []) },
      authProviderConfig: { findFirst: jest.fn(async () => null) },
      user: { findFirst: jest.fn(async () => ({ id: "user-1", tenantId: "tenant-1", email: "owner@example.com" })) },
      providerAccount: {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () => null),
        upsert: providerUpsert,
      },
      gbpAccount: { findUnique: jest.fn(async () => null), upsert: accountUpsert },
      socialChannel: { upsert: channelUpsert },
      location: {
        findUnique: jest.fn(async () => null),
        upsert: locationUpsert,
        update: jest.fn(),
      },
    };
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes("openidconnect.googleapis.com")) {
        return response({ sub: "google-user-1", email: "owner@example.com" });
      }
      if (url.includes("mybusinessaccountmanagement.googleapis.com")) {
        return response({
          accounts: [{
            name: "accounts/123",
            accountName: "Example Business Group",
            type: "ORGANIZATION",
            role: "OWNER",
            verificationState: "VERIFIED",
          }],
        });
      }
      if (url.includes("mybusinessbusinessinformation.googleapis.com")) {
        return response({
          locations: [{
            name: "locations/456",
            title: "Example Shop",
            storeCode: "SHOP-1",
            phoneNumbers: { primaryPhone: "+15550001111" },
            storefrontAddress: {
              addressLines: ["1 Main Street"],
              locality: "Austin",
              administrativeArea: "TX",
              postalCode: "78701",
              regionCode: "US",
            },
            websiteUri: "https://example.com",
            categories: { primaryCategory: { name: "gcid:shop", displayName: "Shop" } },
          }],
        });
      }
      return response({ error: { message: "Unexpected test URL" } }, 500);
    }) as any;
    const service = new GoogleBusinessProfileService({
      db,
      fetchImpl,
      oauthFactory: () => oauth,
      now: () => new Date("2026-08-11T10:00:00Z"),
    });
    const state = signGoogleOAuthState(
      { userId: "user-1", tenantId: "tenant-1" },
      { secret: STATE_SECRET },
    );

    const result = await service.completeOAuth("authorization-code", state);

    expect(result.accounts).toHaveLength(1);
    expect(result.totalLocations).toBe(1);
    expect(providerUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        access_token: expect.stringMatching(/^enc:v1:/),
        refresh_token: expect.stringMatching(/^enc:v1:/),
      }),
    }));
    expect(accountUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        accessToken: expect.stringMatching(/^enc:v1:/),
        refreshToken: expect.stringMatching(/^enc:v1:/),
      }),
    }));
    expect(channelUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        platform: "GOOGLE_BUSINESS",
        accessToken: expect.stringMatching(/^enc:v1:/),
      }),
    }));
    expect(locationUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        tenantId: "tenant-1",
        googleLocationId: "locations/456",
        title: "Example Shop",
      }),
    }));
  });

  test("never calls Google for an unapproved scheduled post", async () => {
    const fetchImpl = jest.fn();
    const db = {
      gbpPost: {
        findUnique: jest.fn(async () => ({
          id: "post-1",
          status: "SCHEDULED",
          approvalStatus: "PENDING",
          scheduledAt: new Date("2026-08-11T09:00:00Z"),
          location: {},
        })),
        updateMany: jest.fn(),
      },
    };
    const service = new GoogleBusinessProfileService({ db, fetchImpl: fetchImpl as any });

    await expect(service.publishScheduledPost("post-1")).rejects.toMatchObject({
      status: 409,
      code: "GOOGLE_POST_APPROVAL_REQUIRED",
    });
    expect(db.gbpPost.updateMany).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("publishes an approved due post to Google and records the returned post ID", async () => {
    const encryptedAccess = encryptGoogleToken("access-token", ENCRYPTION_KEY);
    const encryptedRefresh = encryptGoogleToken("refresh-token", ENCRYPTION_KEY);
    const oauth = oauthClient();
    const publishedAt = new Date("2026-08-11T10:00:00Z");
    const update = jest.fn(async ({ data }) => ({ id: "post-1", ...data }));
    const db: any = {
      platformSetting: { findMany: jest.fn(async () => []) },
      authProviderConfig: { findFirst: jest.fn(async () => null) },
      gbpPost: {
        findUnique: jest.fn(async () => ({
          id: "post-1",
          summary: "Approved launch announcement",
          topicType: "STANDARD",
          status: "SCHEDULED",
          approvalStatus: "APPROVED",
          scheduledAt: new Date("2026-08-11T09:00:00Z"),
          location: {
            id: "location-1",
            tenantId: "tenant-1",
            googleLocationId: "locations/456",
            googleAccount: {
              id: "account-1",
              tenantId: "tenant-1",
              googleAccountId: "accounts/123",
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              tokenExpiresAt: new Date("2026-08-11T11:00:00Z"),
            },
          },
        })),
        updateMany: jest.fn(async () => ({ count: 1 })),
        update,
      },
      gbpAccount: { update: jest.fn(async () => ({})) },
      socialChannel: { updateMany: jest.fn(async () => ({ count: 1 })) },
    };
    const fetchImpl = jest.fn(async () => response({
      name: "accounts/123/locations/456/localPosts/789",
      state: "LIVE",
      searchUrl: "https://example.com/post/789",
    })) as any;
    const service = new GoogleBusinessProfileService({
      db,
      fetchImpl,
      oauthFactory: () => oauth,
      now: () => publishedAt,
    });

    const result = await service.publishScheduledPost("post-1");

    expect(result.skipped).toBe(false);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/localPosts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
      }),
    );
    expect(update).toHaveBeenLastCalledWith({
      where: { id: "post-1" },
      data: {
        googlePostId: "accounts/123/locations/456/localPosts/789",
        status: "PUBLISHED",
        publishedAt,
      },
    });
  });

  test("validates Google local-post payloads before network publication", () => {
    expect(buildGoogleLocalPostPayload({ topicType: "STANDARD", summary: "Hello" })).toEqual({
      languageCode: "en-US",
      summary: "Hello",
      topicType: "STANDARD",
    });
    expect(() => buildGoogleLocalPostPayload({ topicType: "ALERT", summary: "Hello" })).toThrow(
      expect.objectContaining({ code: "GOOGLE_POST_TYPE_UNSUPPORTED" }),
    );
    expect(() => buildGoogleLocalPostPayload({ topicType: "OFFER", summary: "Sale" })).toThrow(
      expect.objectContaining({ code: "GOOGLE_POST_EVENT_DETAILS_REQUIRED" }),
    );
  });
});

