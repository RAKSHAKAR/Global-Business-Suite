import path from "path";

/**
 * SSRF Prevention: Checks if a given URL is safe to fetch (prevents accessing internal localhost or private IPs)
 */
export function isSafeExternalUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    
    // Prevent loopback, private ranges, metadata endpoints
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" || // AWS / Cloud metadata
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      (hostname.startsWith("172.") && parseInt(hostname.split(".")[1], 10) >= 16 && parseInt(hostname.split(".")[1], 10) <= 31)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * File Security: Sanitizes file names and enforces allowed extensions and MIME types
 */
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf", ".doc", ".docx", ".csv", ".xlsx", ".json"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
]);

export function validateFileUpload(fileName: string, mimeType: string): { valid: boolean; reason?: string; safeName?: string } {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, reason: `File extension '${ext}' is not permitted.` };
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, reason: `MIME type '${mimeType}' is not permitted.` };
  }

  // Prevent path traversal in file names
  const safeBase = path.basename(fileName).replace(/[^a-zA-Z0-9_.-]/g, "_");
  const safeName = `${Date.now()}_${safeBase}`;

  return { valid: true, safeName };
}
