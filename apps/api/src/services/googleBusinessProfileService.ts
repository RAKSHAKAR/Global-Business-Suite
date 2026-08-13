import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { prisma } from "@saas/database";
import { JWT_SECRET } from "../config/jwt";

const GOOGLE_OAUTH_AUDIENCE = "gbs-google-business-oauth";
const GOOGLE_OAUTH_ISSUER = "gbs-api";
const GOOGLE_OAUTH_PURPOSE = "CONNECT_GOOGLE_BUSINESS";
const TOKEN_ENVELOPE_PREFIX = "enc:v1";
const BUSINESS_MANAGE_SCOPE = "https://www.googleapis.com/auth/business.manage";
const GOOGLE_SCOPES = [
  BUSINESS_MANAGE_SCOPE,
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];
const ACCOUNT_MANAGEMENT_BASE =
  "https://mybusinessaccountmanagement.googleapis.com/v1";
const BUSINESS_INFORMATION_BASE =
  "https://mybusinessbusinessinformation.googleapis.com/v1";
const LEGACY_BUSINESS_BASE = "https://mybusiness.googleapis.com/v4";
const LOCATION_READ_MASK = [
  "name",
  "title",
  "storeCode",
  "phoneNumbers",
  "storefrontAddress",
  "websiteUri",
  "categories",
  "regularHours",
  "specialHours",
  "metadata",
  "profile",
].join(",");

type OAuthClient = {
  credentials?: Record<string, any>;
  generateAuthUrl(options: Record<string, any>): string;
  getToken(code: string): Promise<{ tokens: Record<string, any> }>;
  setCredentials(tokens: Record<string, any>): void;
  getAccessToken(): Promise<{ token?: string | null } | string | null>;
};

type ServiceDependencies = {
  db?: any;
  fetchImpl?: typeof fetch;
  oauthFactory?: (config: GoogleOAuthConfiguration) => OAuthClient;
  now?: () => Date;
};

export type GoogleOAuthConfiguration = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleOAuthState = {
  userId: string;
  tenantId: string;
  purpose: typeof GOOGLE_OAUTH_PURPOSE;
  nonce: string;
  version: 1;
};

export class GoogleBusinessProfileError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status = 500,
    code = "GOOGLE_BUSINESS_ERROR",
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GoogleBusinessProfileError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isPlaceholder(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("mock-") ||
    normalized.includes("replace_with") ||
    normalized.includes("your_") ||
    normalized === "changeme"
  );
}

function getEncryptionMaterial(explicit?: string): string {
  const material = explicit ?? process.env.ENCRYPTION_KEY;
  if (!material || material.length < 32 || isPlaceholder(material)) {
    throw new GoogleBusinessProfileError(
      "ENCRYPTION_KEY must be configured with at least 32 non-placeholder characters before Google tokens can be stored or used.",
      503,
      "GOOGLE_TOKEN_ENCRYPTION_NOT_CONFIGURED",
    );
  }
  return material;
}

function deriveEncryptionKey(material: string): Buffer {
  return createHash("sha256").update(material, "utf8").digest();
}

/** Encrypts OAuth credentials using an authenticated AES-256-GCM envelope. */
export function encryptGoogleToken(value: string, encryptionMaterial?: string): string {
  if (!value) return value;
  const key = deriveEncryptionKey(getEncryptionMaterial(encryptionMaterial));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    TOKEN_ENVELOPE_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

/**
 * Decrypts the versioned token envelope. Plaintext is returned unchanged so
 * existing installations can be migrated the next time a token is refreshed.
 */
export function decryptGoogleToken(value: string | null | undefined, encryptionMaterial?: string): string | null {
  if (!value) return null;
  if (!value.startsWith(`${TOKEN_ENVELOPE_PREFIX}:`)) return value;

  const parts = value.split(":");
  if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
    throw new GoogleBusinessProfileError(
      "Stored Google credential has an unsupported encrypted format.",
      500,
      "GOOGLE_TOKEN_DECRYPTION_FAILED",
    );
  }

  try {
    const key = deriveEncryptionKey(getEncryptionMaterial(encryptionMaterial));
    const iv = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    const ciphertext = Buffer.from(parts[4], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (error) {
    if (error instanceof GoogleBusinessProfileError) throw error;
    throw new GoogleBusinessProfileError(
      "Stored Google credential could not be decrypted. Verify ENCRYPTION_KEY has not changed.",
      500,
      "GOOGLE_TOKEN_DECRYPTION_FAILED",
    );
  }
}

export function signGoogleOAuthState(
  subject: { userId: string; tenantId: string },
  options: { secret?: string; expiresInSeconds?: number } = {},
): string {
  if (!subject.userId || !subject.tenantId) {
    throw new GoogleBusinessProfileError(
      "A tenant-scoped authenticated user is required to connect Google Business Profile.",
      400,
      "GOOGLE_TENANT_CONTEXT_REQUIRED",
    );
  }

  const payload: GoogleOAuthState = {
    userId: subject.userId,
    tenantId: subject.tenantId,
    purpose: GOOGLE_OAUTH_PURPOSE,
    nonce: randomUUID(),
    version: 1,
  };
  return jwt.sign(payload, options.secret || process.env.GOOGLE_OAUTH_STATE_SECRET || JWT_SECRET, {
    algorithm: "HS256",
    audience: GOOGLE_OAUTH_AUDIENCE,
    issuer: GOOGLE_OAUTH_ISSUER,
    subject: subject.userId,
    expiresIn: options.expiresInSeconds ?? 600,
  });
}

export function verifyGoogleOAuthState(
  state: string,
  options: { secret?: string } = {},
): GoogleOAuthState {
  try {
    const decoded = jwt.verify(
      state,
      options.secret || process.env.GOOGLE_OAUTH_STATE_SECRET || JWT_SECRET,
      {
        algorithms: ["HS256"],
        audience: GOOGLE_OAUTH_AUDIENCE,
        issuer: GOOGLE_OAUTH_ISSUER,
      },
    ) as jwt.JwtPayload & GoogleOAuthState;

    if (
      decoded.purpose !== GOOGLE_OAUTH_PURPOSE ||
      decoded.version !== 1 ||
      !decoded.userId ||
      !decoded.tenantId ||
      decoded.sub !== decoded.userId
    ) {
      throw new Error("invalid state payload");
    }
    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      purpose: GOOGLE_OAUTH_PURPOSE,
      nonce: decoded.nonce,
      version: 1,
    };
  } catch {
    throw new GoogleBusinessProfileError(
      "Google OAuth state is invalid, expired, or was not issued for this connection flow.",
      400,
      "GOOGLE_OAUTH_STATE_INVALID",
    );
  }
}

function formatAddress(address: any): string | null {
  if (!address) return null;
  return [
    ...(Array.isArray(address.addressLines) ? address.addressLines : []),
    address.locality,
    address.administrativeArea,
    address.postalCode,
    address.regionCode,
  ]
    .filter(Boolean)
    .join(", ") || null;
}

function normalizeResourceName(value: unknown, prefix: "accounts" | "locations"): string {
  const name = typeof value === "string" ? value.trim() : "";
  const matcher = prefix === "accounts" ? /^accounts\/[A-Za-z0-9_-]+$/ : /^(?:accounts\/[A-Za-z0-9_-]+\/)?locations\/[A-Za-z0-9_-]+$/;
  if (!matcher.test(name)) {
    throw new GoogleBusinessProfileError(
      `Google returned an invalid ${prefix.slice(0, -1)} resource name.`,
      502,
      "GOOGLE_BUSINESS_INVALID_RESOURCE",
    );
  }
  return name;
}

function safeJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function mapVerificationStatus(value: unknown): string {
  return String(value || "").toUpperCase() === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";
}

function mapPermissionLevel(value: unknown): string {
  const role = String(value || "").toUpperCase();
  if (role.includes("OWNER")) return "OWNER";
  if (role.includes("MANAGER")) return "MANAGER";
  return role || "UNKNOWN";
}

export function redactGoogleAccount<T extends Record<string, any>>(account: T) {
  const { accessToken, refreshToken, ...safe } = account;
  return {
    ...safe,
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
  };
}

function googlePostParent(accountName: string, locationName: string): string {
  const account = normalizeResourceName(accountName, "accounts");
  const location = normalizeResourceName(locationName, "locations");
  if (location.startsWith("accounts/")) {
    if (!location.startsWith(`${account}/`)) {
      throw new GoogleBusinessProfileError(
        "The scheduled post location does not belong to its connected Google account.",
        409,
        "GOOGLE_LOCATION_ACCOUNT_MISMATCH",
      );
    }
    return location;
  }
  return `${account}/${location}`;
}

function googleDateTime(value: Date) {
  return {
    date: {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    },
    time: {
      hours: value.getUTCHours(),
      minutes: value.getUTCMinutes(),
      seconds: value.getUTCSeconds(),
    },
  };
}

export function buildGoogleLocalPostPayload(post: Record<string, any>) {
  const topicType = String(post.topicType || "STANDARD").toUpperCase();
  if (!new Set(["STANDARD", "EVENT", "OFFER"]).has(topicType)) {
    throw new GoogleBusinessProfileError(
      `Google Business local post topic type ${topicType} is not supported by this publisher.`,
      422,
      "GOOGLE_POST_TYPE_UNSUPPORTED",
    );
  }
  if (!post.summary?.trim()) {
    throw new GoogleBusinessProfileError(
      "A non-empty summary is required to publish a Google Business post.",
      422,
      "GOOGLE_POST_SUMMARY_REQUIRED",
    );
  }
  if (post.videoUrl) {
    throw new GoogleBusinessProfileError(
      "Scheduled Google Business publishing currently supports photo or text posts, not video uploads.",
      422,
      "GOOGLE_POST_VIDEO_UNSUPPORTED",
    );
  }

  const payload: Record<string, any> = {
    languageCode: "en-US",
    summary: post.summary.trim(),
    topicType,
  };

  if (post.callToAction && post.callToActionUrl) {
    payload.callToAction = {
      actionType: String(post.callToAction).toUpperCase(),
      url: post.callToActionUrl,
    };
  }
  if (post.photoUrl) {
    payload.media = [{ mediaFormat: "PHOTO", sourceUrl: post.photoUrl }];
  }

  if (topicType === "EVENT" || topicType === "OFFER") {
    if (!post.eventTitle || !post.eventStartDate || !post.eventEndDate) {
      throw new GoogleBusinessProfileError(
        `${topicType} posts require eventTitle, eventStartDate, and eventEndDate.`,
        422,
        "GOOGLE_POST_EVENT_DETAILS_REQUIRED",
      );
    }
    const start = googleDateTime(new Date(post.eventStartDate));
    const end = googleDateTime(new Date(post.eventEndDate));
    payload.event = {
      title: post.eventTitle,
      schedule: {
        startDate: start.date,
        startTime: start.time,
        endDate: end.date,
        endTime: end.time,
      },
    };
  }
  if (topicType === "OFFER") {
    payload.offer = {
      ...(post.couponCode ? { couponCode: post.couponCode } : {}),
      ...(post.redeemOnlineUrl ? { redeemOnlineUrl: post.redeemOnlineUrl } : {}),
      ...(post.termsConditions ? { termsConditions: post.termsConditions } : {}),
    };
  }

  return payload;
}

export class GoogleBusinessProfileService {
  private readonly db: any;
  private readonly fetchImpl: typeof fetch;
  private readonly oauthFactory: (config: GoogleOAuthConfiguration) => OAuthClient;
  private readonly now: () => Date;

  constructor(dependencies: ServiceDependencies = {}) {
    this.db = dependencies.db || prisma;
    this.fetchImpl = dependencies.fetchImpl || fetch;
    this.oauthFactory =
      dependencies.oauthFactory ||
      ((config) => new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri) as OAuthClient);
    this.now = dependencies.now || (() => new Date());
  }

  async getOAuthConfiguration(): Promise<GoogleOAuthConfiguration> {
    const [settings, providerConfig] = await Promise.all([
      this.db.platformSetting.findMany({
        where: { key: { in: ["googleClientId", "googleClientSecret", "googleRedirectUri"] } },
      }),
      this.db.authProviderConfig?.findFirst
        ? this.db.authProviderConfig.findFirst({ where: { provider: "GOOGLE", isEnabled: true } })
        : Promise.resolve(null),
    ]);
    const settingMap = (settings || []).reduce(
      (acc: Record<string, string>, item: any) => ({ ...acc, [item.key]: item.value }),
      {},
    );
    const clientId =
      providerConfig?.clientId || settingMap.googleClientId || process.env.GOOGLE_CLIENT_ID || "";
    const storedSecret =
      providerConfig?.clientSecret || settingMap.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || "";
    const clientSecret = storedSecret.startsWith(`${TOKEN_ENVELOPE_PREFIX}:`)
      ? decryptGoogleToken(storedSecret) || ""
      : storedSecret;
    const redirectUri =
      providerConfig?.redirectUri || settingMap.googleRedirectUri || process.env.GOOGLE_REDIRECT_URI || "";

    const missing = [
      ...(isPlaceholder(clientId) ? ["GOOGLE_CLIENT_ID"] : []),
      ...(isPlaceholder(clientSecret) ? ["GOOGLE_CLIENT_SECRET"] : []),
      ...(isPlaceholder(redirectUri) ? ["GOOGLE_REDIRECT_URI"] : []),
    ];
    if (missing.length) {
      throw new GoogleBusinessProfileError(
        "Google OAuth is not configured. Add the missing server-side credentials before connecting a Business Profile.",
        503,
        "GOOGLE_OAUTH_NOT_CONFIGURED",
        { missing },
      );
    }

    let parsedRedirect: URL;
    try {
      parsedRedirect = new URL(redirectUri);
    } catch {
      throw new GoogleBusinessProfileError(
        "GOOGLE_REDIRECT_URI must be an absolute URL.",
        503,
        "GOOGLE_OAUTH_REDIRECT_INVALID",
      );
    }
    const localRedirect = ["localhost", "127.0.0.1"].includes(parsedRedirect.hostname);
    if (process.env.NODE_ENV === "production" && parsedRedirect.protocol !== "https:" && !localRedirect) {
      throw new GoogleBusinessProfileError(
        "GOOGLE_REDIRECT_URI must use HTTPS outside local development.",
        503,
        "GOOGLE_OAUTH_REDIRECT_INVALID",
      );
    }

    return { clientId, clientSecret, redirectUri };
  }

  async createAuthorizationUrl(userId: string, tenantId: string) {
    const config = await this.getOAuthConfiguration();
    getEncryptionMaterial();
    const state = signGoogleOAuthState({ userId, tenantId });
    const oauth = this.oauthFactory(config);
    return oauth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: GOOGLE_SCOPES,
      state,
    });
  }

  private async googleJson(url: string, accessToken: string, init: RequestInit = {}) {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...(init.headers || {}),
        },
        signal: init.signal || AbortSignal.timeout(30_000),
      });
    } catch (error: any) {
      throw new GoogleBusinessProfileError(
        `Google Business request could not be completed: ${error?.message || "network error"}`,
        502,
        "GOOGLE_BUSINESS_NETWORK_ERROR",
      );
    }

    const raw = await response.text();
    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }
    if (!response.ok) {
      const providerMessage = body?.error?.message || body?.message || `HTTP ${response.status}`;
      const status = response.status === 401 ? 401 : response.status === 403 ? 403 : 502;
      const code =
        response.status === 403
          ? "GOOGLE_BUSINESS_ACCESS_NOT_GRANTED"
          : response.status === 401
            ? "GOOGLE_REAUTHORIZATION_REQUIRED"
            : "GOOGLE_BUSINESS_API_ERROR";
      throw new GoogleBusinessProfileError(
        `Google Business API rejected the request: ${providerMessage}`,
        status,
        code,
        { googleStatus: response.status },
      );
    }
    return body;
  }

  private async listAccounts(accessToken: string): Promise<any[]> {
    const accounts: any[] = [];
    let pageToken = "";
    do {
      const url = new URL(`${ACCOUNT_MANAGEMENT_BASE}/accounts`);
      url.searchParams.set("pageSize", "20");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const body = await this.googleJson(url.toString(), accessToken);
      accounts.push(...(Array.isArray(body.accounts) ? body.accounts : []));
      pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : "";
    } while (pageToken);
    return accounts;
  }

  private async listLocations(accessToken: string, accountName: string): Promise<any[]> {
    const account = normalizeResourceName(accountName, "accounts");
    const locations: any[] = [];
    let pageToken = "";
    do {
      const url = new URL(`${BUSINESS_INFORMATION_BASE}/${account}/locations`);
      url.searchParams.set("readMask", LOCATION_READ_MASK);
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const body = await this.googleJson(url.toString(), accessToken);
      locations.push(...(Array.isArray(body.locations) ? body.locations : []));
      pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : "";
    } while (pageToken);
    return locations;
  }

  private async ensureResourceTenantOwnership(
    model: "gbpAccount" | "location",
    where: Record<string, unknown>,
    tenantId: string,
  ) {
    const existing = await this.db[model].findUnique({ where });
    if (existing && existing.tenantId !== tenantId) {
      throw new GoogleBusinessProfileError(
        "This Google Business resource is already assigned to a different tenant.",
        409,
        "GOOGLE_BUSINESS_TENANT_CONFLICT",
      );
    }
    return existing;
  }

  private async persistAccountAndLocations(options: {
    tenantId: string;
    email: string;
    account: any;
    locations: any[];
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date | null;
    scope: string;
  }) {
    const googleAccountId = normalizeResourceName(options.account?.name, "accounts");
    await this.ensureResourceTenantOwnership("gbpAccount", { googleAccountId }, options.tenantId);
    const encryptedAccess = encryptGoogleToken(options.accessToken);
    const encryptedRefresh = encryptGoogleToken(options.refreshToken);
    const permissionLevel = mapPermissionLevel(options.account?.role);
    const verificationStatus = mapVerificationStatus(options.account?.verificationState);

    const account = await this.db.gbpAccount.upsert({
      where: { googleAccountId },
      update: {
        accountName: options.account?.accountName || googleAccountId,
        email: options.email,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: options.tokenExpiresAt,
        accountHealth: "HEALTHY",
        verificationStatus,
        permissionLevel,
        lastHealthCheckAt: this.now(),
      },
      create: {
        tenantId: options.tenantId,
        accountName: options.account?.accountName || googleAccountId,
        googleAccountId,
        email: options.email,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: options.tokenExpiresAt,
        accountHealth: "HEALTHY",
        verificationStatus,
        permissionLevel,
        lastHealthCheckAt: this.now(),
      },
    });

    await this.db.socialChannel.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: options.tenantId,
          platform: "GOOGLE_BUSINESS",
          accountId: googleAccountId,
        },
      },
      update: {
        accountName: account.accountName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: options.tokenExpiresAt,
        scopes: safeJson(options.scope ? options.scope.split(" ") : GOOGLE_SCOPES),
        isActive: true,
        healthStatus: "HEALTHY",
        lastHealthCheckAt: this.now(),
        metadata: safeJson({ email: options.email, source: "GOOGLE_OAUTH" }),
      },
      create: {
        tenantId: options.tenantId,
        platform: "GOOGLE_BUSINESS",
        accountId: googleAccountId,
        accountName: account.accountName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: options.tokenExpiresAt,
        scopes: safeJson(options.scope ? options.scope.split(" ") : GOOGLE_SCOPES),
        isActive: true,
        healthStatus: "HEALTHY",
        lastHealthCheckAt: this.now(),
        metadata: safeJson({ email: options.email, source: "GOOGLE_OAUTH" }),
      },
    });

    const persistedLocations: any[] = [];
    for (const rawLocation of options.locations) {
      const googleLocationId = normalizeResourceName(rawLocation?.name, "locations");
      const existing = await this.ensureResourceTenantOwnership(
        "location",
        { googleLocationId },
        options.tenantId,
      );
      const mapped = {
        googleAccountId: account.id,
        locationName: googleLocationId,
        title: rawLocation?.title || googleLocationId,
        description: rawLocation?.profile?.description || null,
        storeCode: rawLocation?.storeCode || null,
        primaryPhone: rawLocation?.phoneNumbers?.primaryPhone || null,
        secondaryPhonesJson: safeJson(rawLocation?.phoneNumbers?.additionalPhones || []),
        websiteUrl: rawLocation?.websiteUri || null,
        address: formatAddress(rawLocation?.storefrontAddress),
        categoriesJson: safeJson(rawLocation?.categories || {}),
        attributesJson: safeJson({ metadata: rawLocation?.metadata || {} }),
        regularHoursJson: safeJson(rawLocation?.regularHours || {}),
        specialHoursJson: safeJson(rawLocation?.specialHours || []),
        verificationStatus,
        permissionLevel,
        accountHealth: "HEALTHY",
        lastSyncAt: this.now(),
      };
      const location = await this.db.location.upsert({
        where: { googleLocationId },
        update: mapped,
        create: {
          tenantId: options.tenantId,
          googleLocationId,
          ...mapped,
          isSyncEnabled: false,
        },
      });
      // Preserve an existing user's selection; new discoveries start disabled.
      if (existing?.isSyncEnabled && !location.isSyncEnabled) {
        await this.db.location.update({ where: { id: location.id }, data: { isSyncEnabled: true } });
        location.isSyncEnabled = true;
      }
      persistedLocations.push(location);
    }
    return { account, locations: persistedLocations };
  }

  private async discoverAndPersist(options: {
    tenantId: string;
    email: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date | null;
    scope: string;
  }) {
    const remoteAccounts = await this.listAccounts(options.accessToken);
    if (!remoteAccounts.length) {
      throw new GoogleBusinessProfileError(
        "Google authorization succeeded, but no Business Profile accounts were available to this user.",
        404,
        "GOOGLE_BUSINESS_ACCOUNTS_NOT_FOUND",
      );
    }

    const results: any[] = [];
    for (const remoteAccount of remoteAccounts) {
      const locations = await this.listLocations(options.accessToken, remoteAccount.name);
      results.push(
        await this.persistAccountAndLocations({
          ...options,
          account: remoteAccount,
          locations,
        }),
      );
    }
    return results;
  }

  async completeOAuth(code: string, stateToken: string) {
    if (!code?.trim() || !stateToken?.trim()) {
      throw new GoogleBusinessProfileError(
        "Google OAuth callback requires both code and state.",
        400,
        "GOOGLE_OAUTH_CALLBACK_INVALID",
      );
    }
    getEncryptionMaterial();
    const state = verifyGoogleOAuthState(stateToken);
    const user = await this.db.user.findFirst({
      where: { id: state.userId, tenantId: state.tenantId, isActive: true },
    });
    if (!user) {
      throw new GoogleBusinessProfileError(
        "The Google OAuth request is no longer associated with an active tenant user.",
        401,
        "GOOGLE_OAUTH_SUBJECT_INVALID",
      );
    }

    const config = await this.getOAuthConfiguration();
    const oauth = this.oauthFactory(config);
    let exchanged: Record<string, any>;
    try {
      ({ tokens: exchanged } = await oauth.getToken(code));
    } catch (error: any) {
      throw new GoogleBusinessProfileError(
        `Google OAuth code exchange failed: ${error?.message || "authorization rejected"}`,
        401,
        "GOOGLE_OAUTH_CODE_EXCHANGE_FAILED",
      );
    }
    if (!exchanged?.access_token) {
      throw new GoogleBusinessProfileError(
        "Google OAuth did not return an access token.",
        401,
        "GOOGLE_OAUTH_ACCESS_TOKEN_MISSING",
      );
    }
    oauth.setCredentials(exchanged);

    const userInfo = await this.googleJson(
      "https://openidconnect.googleapis.com/v1/userinfo",
      exchanged.access_token,
    );
    const googleId = typeof userInfo?.sub === "string" ? userInfo.sub : "";
    const email = typeof userInfo?.email === "string" ? userInfo.email : user.email;
    if (!googleId) {
      throw new GoogleBusinessProfileError(
        "Google user information did not contain a stable account identifier.",
        502,
        "GOOGLE_IDENTITY_INVALID",
      );
    }

    const existingByIdentity = await this.db.providerAccount.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: googleId } },
    });
    if (existingByIdentity && existingByIdentity.userId !== state.userId) {
      throw new GoogleBusinessProfileError(
        "This Google identity is already linked to another platform user.",
        409,
        "GOOGLE_IDENTITY_ALREADY_LINKED",
      );
    }
    const existingForUser = existingByIdentity || (await this.db.providerAccount.findFirst({
      where: { provider: "google", userId: state.userId },
    }));
    const priorRefresh = existingForUser?.refresh_token
      ? decryptGoogleToken(existingForUser.refresh_token)
      : null;
    const refreshToken = exchanged.refresh_token || priorRefresh;
    if (!refreshToken) {
      throw new GoogleBusinessProfileError(
        "Google did not issue an offline refresh token. Revoke the prior app grant and reconnect with consent.",
        409,
        "GOOGLE_REFRESH_TOKEN_MISSING",
      );
    }

    const encryptedAccess = encryptGoogleToken(exchanged.access_token);
    const encryptedRefresh = encryptGoogleToken(refreshToken);
    const providerAccount = await this.db.providerAccount.upsert({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: googleId } },
      update: {
        userId: state.userId,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        expires_at: exchanged.expiry_date ? Math.floor(exchanged.expiry_date / 1000) : null,
        token_type: exchanged.token_type || "Bearer",
        scope: exchanged.scope || GOOGLE_SCOPES.join(" "),
        id_token: exchanged.id_token ? encryptGoogleToken(exchanged.id_token) : null,
      },
      create: {
        userId: state.userId,
        type: "oauth",
        provider: "google",
        providerAccountId: googleId,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        expires_at: exchanged.expiry_date ? Math.floor(exchanged.expiry_date / 1000) : null,
        token_type: exchanged.token_type || "Bearer",
        scope: exchanged.scope || GOOGLE_SCOPES.join(" "),
        id_token: exchanged.id_token ? encryptGoogleToken(exchanged.id_token) : null,
      },
    });

    const discovered = await this.discoverAndPersist({
      tenantId: state.tenantId,
      email,
      accessToken: exchanged.access_token,
      refreshToken,
      tokenExpiresAt: exchanged.expiry_date ? new Date(exchanged.expiry_date) : null,
      scope: exchanged.scope || GOOGLE_SCOPES.join(" "),
    });
    return {
      state,
      providerAccountId: providerAccount.id,
      email,
      accounts: discovered.map(({ account, locations }) => ({
        ...redactGoogleAccount(account),
        locations,
      })),
      totalLocations: discovered.reduce((count, item) => count + item.locations.length, 0),
    };
  }

  private async authorizedTokenFromStored(options: {
    accessToken: string;
    refreshToken?: string | null;
    tokenExpiresAt?: Date | null;
    onRefresh: (tokens: { accessToken: string; refreshToken: string; tokenExpiresAt: Date | null }) => Promise<void>;
  }) {
    getEncryptionMaterial();
    const accessToken = decryptGoogleToken(options.accessToken);
    const refreshToken = decryptGoogleToken(options.refreshToken);
    if (!accessToken && !refreshToken) {
      throw new GoogleBusinessProfileError(
        "The stored Google connection has no usable OAuth credentials.",
        401,
        "GOOGLE_REAUTHORIZATION_REQUIRED",
      );
    }
    const config = await this.getOAuthConfiguration();
    const oauth = this.oauthFactory(config);
    oauth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: options.tokenExpiresAt?.getTime(),
    });
    let tokenResult: { token?: string | null } | string | null;
    try {
      tokenResult = await oauth.getAccessToken();
    } catch (error: any) {
      throw new GoogleBusinessProfileError(
        `Google connection must be authorized again: ${error?.message || "token refresh failed"}`,
        401,
        "GOOGLE_REAUTHORIZATION_REQUIRED",
      );
    }
    const resolved =
      typeof tokenResult === "string" ? tokenResult : tokenResult?.token || oauth.credentials?.access_token;
    if (!resolved) {
      throw new GoogleBusinessProfileError(
        "Google connection could not provide an access token.",
        401,
        "GOOGLE_REAUTHORIZATION_REQUIRED",
      );
    }
    const refreshedToken = oauth.credentials?.refresh_token || refreshToken;
    if (!refreshedToken) {
      throw new GoogleBusinessProfileError(
        "Google connection has no offline refresh token.",
        401,
        "GOOGLE_REAUTHORIZATION_REQUIRED",
      );
    }
    const expiry = oauth.credentials?.expiry_date
      ? new Date(oauth.credentials.expiry_date)
      : options.tokenExpiresAt || null;
    await options.onRefresh({ accessToken: resolved, refreshToken: refreshedToken, tokenExpiresAt: expiry });
    return { accessToken: resolved, refreshToken: refreshedToken, tokenExpiresAt: expiry };
  }

  async discoverForUser(userId: string, tenantId: string) {
    const providerAccount = await this.db.providerAccount.findFirst({
      where: { userId, provider: "google" },
    });
    if (!providerAccount?.access_token) {
      throw new GoogleBusinessProfileError(
        "Connect Google Business Profile before detecting accounts and locations.",
        409,
        "GOOGLE_BUSINESS_NOT_CONNECTED",
      );
    }
    const user = await this.db.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) {
      throw new GoogleBusinessProfileError(
        "Authenticated user does not belong to the requested tenant.",
        403,
        "GOOGLE_BUSINESS_TENANT_MISMATCH",
      );
    }
    const authorized = await this.authorizedTokenFromStored({
      accessToken: providerAccount.access_token,
      refreshToken: providerAccount.refresh_token,
      tokenExpiresAt: providerAccount.expires_at ? new Date(providerAccount.expires_at * 1000) : null,
      onRefresh: async (tokens) => {
        await this.db.providerAccount.update({
          where: { id: providerAccount.id },
          data: {
            access_token: encryptGoogleToken(tokens.accessToken),
            refresh_token: encryptGoogleToken(tokens.refreshToken),
            expires_at: tokens.tokenExpiresAt ? Math.floor(tokens.tokenExpiresAt.getTime() / 1000) : null,
          },
        });
      },
    });
    const discovered = await this.discoverAndPersist({
      tenantId,
      email: user.email,
      accessToken: authorized.accessToken,
      refreshToken: authorized.refreshToken,
      tokenExpiresAt: authorized.tokenExpiresAt,
      scope: providerAccount.scope || GOOGLE_SCOPES.join(" "),
    });
    return discovered.map(({ account, locations }) => ({
      ...redactGoogleAccount(account),
      locations,
    }));
  }

  async syncStoredAccount(accountId: string, tenantId: string) {
    const account = await this.db.gbpAccount.findFirst({ where: { id: accountId, tenantId } });
    if (!account) {
      throw new GoogleBusinessProfileError(
        "Google Business account was not found for this tenant.",
        404,
        "GOOGLE_BUSINESS_ACCOUNT_NOT_FOUND",
      );
    }
    const authorized = await this.authorizedTokenFromStored({
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiresAt: account.tokenExpiresAt,
      onRefresh: async (tokens) => {
        const encryptedAccess = encryptGoogleToken(tokens.accessToken);
        const encryptedRefresh = encryptGoogleToken(tokens.refreshToken);
        await Promise.all([
          this.db.gbpAccount.update({
            where: { id: account.id },
            data: {
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              tokenExpiresAt: tokens.tokenExpiresAt,
              accountHealth: "HEALTHY",
              lastHealthCheckAt: this.now(),
            },
          }),
          this.db.socialChannel.updateMany({
            where: { tenantId, platform: "GOOGLE_BUSINESS", accountId: account.googleAccountId },
            data: {
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              tokenExpiresAt: tokens.tokenExpiresAt,
              healthStatus: "HEALTHY",
              lastHealthCheckAt: this.now(),
            },
          }),
        ]);
      },
    });
    const remoteLocations = await this.listLocations(authorized.accessToken, account.googleAccountId);
    const persisted = await this.persistAccountAndLocations({
      tenantId,
      email: account.email,
      account: {
        name: account.googleAccountId,
        accountName: account.accountName,
        role: account.permissionLevel,
        verificationState: account.verificationStatus,
      },
      locations: remoteLocations,
      accessToken: authorized.accessToken,
      refreshToken: authorized.refreshToken,
      tokenExpiresAt: authorized.tokenExpiresAt,
      scope: GOOGLE_SCOPES.join(" "),
    });
    return { account: redactGoogleAccount(persisted.account), locations: persisted.locations };
  }

  async syncTenant(tenantId: string) {
    const accounts = await this.db.gbpAccount.findMany({ where: { tenantId } });
    if (!accounts.length) {
      throw new GoogleBusinessProfileError(
        "No Google Business account is connected for this tenant.",
        409,
        "GOOGLE_BUSINESS_NOT_CONNECTED",
      );
    }
    const results = [];
    for (const account of accounts) {
      results.push(await this.syncStoredAccount(account.id, tenantId));
    }
    return {
      accounts: results.length,
      locations: results.reduce((count, result) => count + result.locations.length, 0),
      syncedAt: this.now(),
    };
  }

  async publishScheduledPost(postId: string) {
    const post = await this.db.gbpPost.findUnique({
      where: { id: postId },
      include: { location: { include: { googleAccount: true } } },
    });
    if (!post) {
      throw new GoogleBusinessProfileError("Scheduled GBP post was not found.", 404, "GOOGLE_POST_NOT_FOUND");
    }
    if (post.approvalStatus !== "APPROVED") {
      throw new GoogleBusinessProfileError(
        "Google Business post must be approved before publishing.",
        409,
        "GOOGLE_POST_APPROVAL_REQUIRED",
      );
    }
    if (post.status !== "SCHEDULED" || !post.scheduledAt || post.scheduledAt > this.now()) {
      throw new GoogleBusinessProfileError(
        "Google Business post is not due for scheduled publishing.",
        409,
        "GOOGLE_POST_NOT_DUE",
      );
    }
    const account = post.location?.googleAccount;
    if (!account || account.tenantId !== post.location.tenantId) {
      throw new GoogleBusinessProfileError(
        "The post location has no valid Google Business OAuth account.",
        409,
        "GOOGLE_BUSINESS_ACCOUNT_NOT_CONNECTED",
      );
    }

    const claimed = await this.db.gbpPost.updateMany({
      where: { id: post.id, status: "SCHEDULED", approvalStatus: "APPROVED" },
      data: { status: "PUBLISHING" },
    });
    if (claimed.count !== 1) {
      return { skipped: true, reason: "ALREADY_CLAIMED" };
    }

    try {
      const authorized = await this.authorizedTokenFromStored({
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        tokenExpiresAt: account.tokenExpiresAt,
        onRefresh: async (tokens) => {
          const encryptedAccess = encryptGoogleToken(tokens.accessToken);
          const encryptedRefresh = encryptGoogleToken(tokens.refreshToken);
          await Promise.all([
            this.db.gbpAccount.update({
              where: { id: account.id },
              data: {
                accessToken: encryptedAccess,
                refreshToken: encryptedRefresh,
                tokenExpiresAt: tokens.tokenExpiresAt,
                accountHealth: "HEALTHY",
                lastHealthCheckAt: this.now(),
              },
            }),
            this.db.socialChannel.updateMany({
              where: {
                tenantId: account.tenantId,
                platform: "GOOGLE_BUSINESS",
                accountId: account.googleAccountId,
              },
              data: {
                accessToken: encryptedAccess,
                refreshToken: encryptedRefresh,
                tokenExpiresAt: tokens.tokenExpiresAt,
                healthStatus: "HEALTHY",
                lastHealthCheckAt: this.now(),
              },
            }),
          ]);
        },
      });
      const parent = googlePostParent(account.googleAccountId, post.location.googleLocationId);
      const payload = buildGoogleLocalPostPayload(post);
      const published = await this.googleJson(
        `${LEGACY_BUSINESS_BASE}/${parent}/localPosts`,
        authorized.accessToken,
        { method: "POST", body: JSON.stringify(payload) },
      );
      if (!published?.name) {
        throw new GoogleBusinessProfileError(
          "Google Business API did not return a published local post identifier.",
          502,
          "GOOGLE_POST_PUBLISH_RESPONSE_INVALID",
        );
      }
      const updated = await this.db.gbpPost.update({
        where: { id: post.id },
        data: {
          googlePostId: published.name,
          status: "PUBLISHED",
          publishedAt: this.now(),
        },
      });
      return { skipped: false, post: updated, google: published };
    } catch (error) {
      await this.db.gbpPost.update({ where: { id: post.id }, data: { status: "FAILED" } }).catch(() => {});
      throw error;
    }
  }
}

export const googleBusinessProfileService = new GoogleBusinessProfileService();
