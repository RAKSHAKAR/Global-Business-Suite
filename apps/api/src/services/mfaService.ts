import crypto from "crypto";

export class MfaService {
  // Base32 alphabet for TOTP secret encoding
  private static BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  /**
   * Generates a 32-character Base32 random secret for TOTP setup
   */
  public static generateSecret(): string {
    const bytes = crypto.randomBytes(20);
    let secret = "";
    for (let i = 0; i < bytes.length; i++) {
      secret += this.BASE32_CHARS[bytes[i] % 32];
    }
    return secret;
  }

  /**
   * Constructs the OTPAuth URI for QR code generation
   */
  public static generateOtpAuthUri(
    label: string,
    secret: string,
    issuer = "Global Business Suite (GBS)",
  ): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }

  /**
   * Verifies a 6-digit TOTP passcode against secret
   */
  public static verifyTotp(
    passcode: string,
    secret: string,
    window = 1,
  ): boolean {
    if (!passcode || passcode.length !== 6 || !/^\d+$/.test(passcode)) {
      return false;
    }

    const timeStep = 30;
    const epoch = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(epoch / timeStep);

    // Test counter within time window (+/- 1 window for clock skew)
    for (let i = -window; i <= window; i++) {
      const calculatedToken = this.generateTotpForCounter(
        secret,
        currentCounter + i,
      );
      if (calculatedToken === passcode) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates 8 random 8-character hex recovery codes
   */
  public static generateRecoveryCodes(count = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Internal HMAC-SHA1 RFC 6238 TOTP computation
   */
  private static generateTotpForCounter(
    secret: string,
    counter: number,
  ): string {
    const key = this.base32Decode(secret);
    const buffer = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
      buffer[i] = counter & 0xff;
      counter >>= 8;
    }

    const hmac = crypto.createHmac("sha1", key);
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, "0");
  }

  /**
   * Decodes Base32 secret string into binary Buffer
   */
  private static base32Decode(input: string): Buffer {
    const cleanInput = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
    let bits = 0;
    let value = 0;
    const output = [];

    for (let i = 0; i < cleanInput.length; i++) {
      value = (value << 5) | this.BASE32_CHARS.indexOf(cleanInput[i]);
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(output);
  }
}
