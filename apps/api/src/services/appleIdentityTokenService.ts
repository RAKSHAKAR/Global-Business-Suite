import {
  createPublicKey,
  verify as verifySignature,
} from "crypto";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS_URL = `${APPLE_ISSUER}/auth/keys`;
const CLOCK_TOLERANCE_SECONDS = 60;
const JWKS_CACHE_MS = 60 * 60 * 1000;

interface AppleJwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

interface AppleJwksResponse {
  keys: AppleJwk[];
}

interface AppleTokenHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

export interface VerifiedAppleIdentity {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  iat?: number;
  email?: string;
  email_verified?: string | boolean;
  is_private_email?: string | boolean;
  nonce?: string;
}

export class AppleIdentityTokenError extends Error {
  constructor(
    message: string,
    public readonly code = "INVALID_SSO_TOKEN",
  ) {
    super(message);
    this.name = "AppleIdentityTokenError";
  }
}

export class AppleIdentityProviderUnavailableError extends Error {
  constructor(message = "Apple identity verification is temporarily unavailable") {
    super(message);
    this.name = "AppleIdentityProviderUnavailableError";
  }
}

let cachedJwks: { keys: AppleJwk[]; expiresAt: number } | null = null;

function decodeJsonSegment<T>(segment: string, label: string): T {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
  } catch {
    throw new AppleIdentityTokenError(`Invalid Apple token ${label}`);
  }
}

async function loadAppleJwks(): Promise<AppleJwk[]> {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) {
    return cachedJwks.keys;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(APPLE_JWKS_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppleIdentityProviderUnavailableError(
        `Apple JWKS endpoint returned HTTP ${response.status}`,
      );
    }

    const body = (await response.json()) as AppleJwksResponse;
    if (!Array.isArray(body?.keys) || body.keys.length === 0) {
      throw new AppleIdentityProviderUnavailableError(
        "Apple JWKS endpoint returned no signing keys",
      );
    }

    cachedJwks = {
      keys: body.keys,
      expiresAt: Date.now() + JWKS_CACHE_MS,
    };
    return body.keys;
  } catch (error) {
    if (error instanceof AppleIdentityProviderUnavailableError) throw error;
    throw new AppleIdentityProviderUnavailableError(
      error instanceof Error
        ? `Unable to retrieve Apple signing keys: ${error.message}`
        : "Unable to retrieve Apple signing keys",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verify an Apple identity token using Apple's live RS256 signing keys.
 *
 * The decoded header is used only to select a key. No claim is accepted until
 * the signature, issuer, audience, expiry, and subject have all been verified.
 */
export async function verifyAppleIdentityToken(
  identityToken: string,
  expectedAudience: string,
): Promise<VerifiedAppleIdentity> {
  const segments = identityToken.split(".");
  if (segments.length !== 3 || segments.some((segment) => !segment)) {
    throw new AppleIdentityTokenError("Invalid Apple identity token format");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  const header = decodeJsonSegment<AppleTokenHeader>(encodedHeader, "header");

  if (header.alg !== "RS256" || !header.kid) {
    throw new AppleIdentityTokenError(
      "Apple identity token must use an identified RS256 signing key",
    );
  }

  const keys = await loadAppleJwks();
  const signingKey = keys.find(
    (key) =>
      key.kid === header.kid &&
      key.kty === "RSA" &&
      (!key.alg || key.alg === "RS256") &&
      (!key.use || key.use === "sig"),
  );

  if (!signingKey) {
    // A key rotation can make a cached set stale. Refresh once before failing.
    cachedJwks = null;
    const refreshedKeys = await loadAppleJwks();
    const refreshedKey = refreshedKeys.find(
      (key) =>
        key.kid === header.kid &&
        key.kty === "RSA" &&
        (!key.alg || key.alg === "RS256") &&
        (!key.use || key.use === "sig"),
    );
    if (!refreshedKey) {
      throw new AppleIdentityTokenError("Apple signing key was not recognized");
    }
    return verifyWithKey(
      encodedHeader,
      encodedPayload,
      encodedSignature,
      refreshedKey,
      expectedAudience,
    );
  }

  return verifyWithKey(
    encodedHeader,
    encodedPayload,
    encodedSignature,
    signingKey,
    expectedAudience,
  );
}

function verifyWithKey(
  encodedHeader: string,
  encodedPayload: string,
  encodedSignature: string,
  signingKey: AppleJwk,
  expectedAudience: string,
): VerifiedAppleIdentity {
  let publicKey;
  try {
    publicKey = createPublicKey({ key: signingKey as any, format: "jwk" });
  } catch {
    throw new AppleIdentityTokenError("Apple signing key was invalid");
  }

  const signatureIsValid = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`, "ascii"),
    publicKey,
    Buffer.from(encodedSignature, "base64url"),
  );

  if (!signatureIsValid) {
    throw new AppleIdentityTokenError("Apple identity token signature is invalid");
  }

  const payload = decodeJsonSegment<VerifiedAppleIdentity>(
    encodedPayload,
    "payload",
  );
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== APPLE_ISSUER) {
    throw new AppleIdentityTokenError("Apple token issuer mismatch");
  }

  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(expectedAudience)) {
    throw new AppleIdentityTokenError("Apple token audience mismatch");
  }

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new AppleIdentityTokenError("Apple token is missing its subject claim");
  }

  if (typeof payload.exp !== "number") {
    throw new AppleIdentityTokenError("Apple token is missing its expiry claim");
  }
  if (payload.exp < now - CLOCK_TOLERANCE_SECONDS) {
    throw new AppleIdentityTokenError("Apple token has expired", "TOKEN_EXPIRED");
  }

  if (
    payload.iat !== undefined &&
    (typeof payload.iat !== "number" || payload.iat > now + CLOCK_TOLERANCE_SECONDS)
  ) {
    throw new AppleIdentityTokenError("Apple token issued-at claim is invalid");
  }

  return payload;
}

/** Test-only cache reset; it does not bypass any verification. */
export function clearAppleJwksCacheForTests(): void {
  if (process.env.NODE_ENV === "test") cachedJwks = null;
}
