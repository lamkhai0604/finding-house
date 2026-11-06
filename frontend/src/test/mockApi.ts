import { vi } from "vitest";

type Handler = (request: {
  body: unknown;
  headers: Record<string, string>;
  /** The full request URL, for routes that read the query string. */
  url: URL;
}) => Response | Promise<Response>;

/**
 * Replaces fetch with a fake backend. Keys are "METHOD /path"; unknown routes answer 404.
 * Returns the mock so tests can inspect calls.
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      const method = (init?.method ?? "GET").toUpperCase();
      const handler = routes[`${method} ${url.pathname}`];
      if (!handler) {
        return Response.json(
          { code: "NOT_FOUND", message: "Not found", fieldErrors: [] },
          { status: 404 },
        );
      }
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const headers = (init?.headers ?? {}) as Record<string, string>;
      return handler({ body, headers, url });
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors: { field: string; message: string }[] = [],
): Response {
  return Response.json({ code, message, fieldErrors }, { status });
}
