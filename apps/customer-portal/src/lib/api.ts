export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000"
).replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
};

export async function apiRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as T & ErrorPayload)
    : null;

  if (!response.ok) {
    const errorPayload = payload as ErrorPayload | null;
    throw new ApiError(
      errorPayload?.error || errorPayload?.message || `Request failed (${response.status})`,
      response.status,
      errorPayload?.code,
    );
  }

  return payload as T;
}

