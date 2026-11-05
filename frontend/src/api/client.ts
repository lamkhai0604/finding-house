import type { ApiErrorBody } from "./types";

const TIMEOUT_MS = 10000;

/** An error response from the API, or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** Field-level messages keyed by field name, for showing next to inputs. */
  fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const { field, message } of this.body.fieldErrors) {
      result[field] ??= message;
    }
    return result;
  }
}

let currentToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Set by the auth session; every request sends this token when present. */
export function setAccessToken(token: string | null): void {
  currentToken = token;
}

/**
 * Called when a request that carried a token gets 401 (expired or revoked), so the session can
 * end instead of looking logged in while every call fails.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export async function apiRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Please try again.",
      fieldErrors: [],
    });
  }

  const data: unknown = await readJson(response);
  if (response.status === 401 && headers.Authorization) {
    onUnauthorized?.();
  }
  if (!response.ok) {
    throw new ApiError(response.status, toErrorBody(data));
  }
  return data as T;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toErrorBody(data: unknown): ApiErrorBody {
  if (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    "message" in data
  ) {
    const body = data as Partial<ApiErrorBody>;
    return {
      code: String(body.code),
      message: String(body.message),
      fieldErrors: Array.isArray(body.fieldErrors) ? body.fieldErrors : [],
    };
  }
  return {
    code: "UNKNOWN_ERROR",
    message: "Something went wrong. Please try again.",
    fieldErrors: [],
  };
}
