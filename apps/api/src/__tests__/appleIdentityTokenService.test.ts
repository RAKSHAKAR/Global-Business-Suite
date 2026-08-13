import {
  generateKeyPairSync,
  sign,
} from "crypto";
import {
  AppleIdentityProviderUnavailableError,
  AppleIdentityTokenError,
  clearAppleJwksCacheForTests,
  verifyAppleIdentityToken,
} from "../services/appleIdentityTokenService";

const AUDIENCE = "com.example.gbs";
const KEY_ID = "apple-test-key";

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("Apple identity token cryptographic verification", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const publicJwk = publicKey.export({ format: "jwk" }) as Record<string, unknown>;
  const originalFetch = global.fetch;

  function buildToken(
    payloadOverrides: Record<string, unknown> = {},
    signingKey = privateKey,
  ): string {
    const header = encode({ alg: "RS256", kid: KEY_ID, typ: "JWT" });
    const payload = encode({
      iss: "https://appleid.apple.com",
      aud: AUDIENCE,
      sub: "apple-user-123",
      email: "verified-apple@example.com",
      email_verified: "true",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payloadOverrides,
    });
    const signature = sign(
      "RSA-SHA256",
      Buffer.from(`${header}.${payload}`, "ascii"),
      signingKey,
    ).toString("base64url");
    return `${header}.${payload}.${signature}`;
  }

  beforeEach(() => {
    clearAppleJwksCacheForTests();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        keys: [
          {
            ...publicJwk,
            kid: KEY_ID,
            alg: "RS256",
            use: "sig",
          },
        ],
      }),
    } as any);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("accepts a valid Apple-signed token with the expected issuer and audience", async () => {
    const payload = await verifyAppleIdentityToken(buildToken(), AUDIENCE);

    expect(payload.sub).toBe("apple-user-123");
    expect(payload.email).toBe("verified-apple@example.com");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://appleid.apple.com/auth/keys",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects a token signed by an untrusted private key", async () => {
    const attacker = generateKeyPairSync("rsa", { modulusLength: 2048 });

    await expect(
      verifyAppleIdentityToken(buildToken({}, attacker.privateKey), AUDIENCE),
    ).rejects.toBeInstanceOf(AppleIdentityTokenError);
  });

  it("rejects audience and expiry claims only after validating the signature", async () => {
    await expect(
      verifyAppleIdentityToken(buildToken({ aud: "attacker.example" }), AUDIENCE),
    ).rejects.toMatchObject({ code: "INVALID_SSO_TOKEN" });

    clearAppleJwksCacheForTests();
    await expect(
      verifyAppleIdentityToken(
        buildToken({ exp: Math.floor(Date.now() / 1000) - 3600 }),
        AUDIENCE,
      ),
    ).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
  });

  it("fails closed when Apple signing keys are unavailable", async () => {
    clearAppleJwksCacheForTests();
    global.fetch = jest.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(
      verifyAppleIdentityToken(buildToken(), AUDIENCE),
    ).rejects.toBeInstanceOf(AppleIdentityProviderUnavailableError);
  });
});
