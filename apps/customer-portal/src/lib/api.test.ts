import { apiRequest } from "./api";
import fs from "node:fs";
import path from "node:path";

function listTsxFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listTsxFiles(target) : entry.name.endsWith(".tsx") ? [target] : [];
  });
}

describe("customer API client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("uses the configured API origin and includes the bearer token", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true }),
    });
    global.fetch = fetchMock;

    await expect(apiRequest<{ ok: boolean }>("/api/v1/customer/dashboard-summary", "token-123"))
      .resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4000/api/v1/customer/dashboard-summary",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("surfaces API error messages and status codes", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => "application/json" },
      json: async () => ({ error: "Provider is not configured", code: "NOT_CONFIGURED" }),
    });

    await expect(apiRequest("/api/v1/reviews/requests", "token-123")).rejects.toMatchObject({
      message: "Provider is not configured",
      status: 503,
      code: "NOT_CONFIGURED",
    });
  });

  it("keeps customer pages off relative or hard-coded API origins", () => {
    const appDirectory = path.resolve(process.cwd(), "src/app");
    const offenders = listTsxFiles(appDirectory)
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8");
        return (
          /fetch\(\s*[`'"]\/api\/v1\/customer/.test(source) ||
          /fetch\(\s*[`'"]http:\/\/(?:localhost|127\.0\.0\.1):4000/.test(source)
        );
      })
      .map((file) => path.relative(appDirectory, file));

    expect(offenders).toEqual([]);
  });
});
