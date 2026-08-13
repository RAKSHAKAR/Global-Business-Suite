import { isSafeExternalUrl, validateFileUpload } from "../../utils/securityUtils";

describe("Phase 8 - Security & Validation Utilities", () => {
  test("isSafeExternalUrl should block localhost, internal IPs, and non-http/https schemes", () => {
    expect(isSafeExternalUrl("http://localhost:3000")).toBe(false);
    expect(isSafeExternalUrl("http://127.0.0.1")).toBe(false);
    expect(isSafeExternalUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isSafeExternalUrl("ftp://example.com/file")).toBe(false);
    expect(isSafeExternalUrl("https://api.google.com/data")).toBe(true);
  });

  test("validateFileUpload should enforce extension and MIME type restrictions", () => {
    const invalidExt = validateFileUpload("malicious.exe", "application/x-msdownload");
    expect(invalidExt.valid).toBe(false);

    const validImage = validateFileUpload("photo.png", "image/png");
    expect(validImage.valid).toBe(true);
    expect(validImage.safeName).toBeDefined();
  });
});
