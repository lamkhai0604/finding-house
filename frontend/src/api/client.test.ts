import { describe, expect, it, vi } from "vitest";
import { apiError, mockApi } from "../test/mockApi";
import {
  ApiError,
  apiRequest,
  setAccessToken,
  setUnauthorizedHandler,
} from "./client";
import { searchQuery } from "./listings";

/** Awaits a request that must fail and returns its ApiError. */
async function rejection(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request;
  } catch (e) {
    if (e instanceof ApiError) {
      return e;
    }
    throw e;
  }
  throw new Error("expected the request to fail");
}

describe("apiRequest", () => {
  it("sends JSON and the bearer token, and returns the parsed body", async () => {
    const fetchMock = mockApi({
      "POST /api/v1/things": ({ body, headers }) =>
        Response.json({ echoed: body, auth: headers.Authorization }),
    });
    setAccessToken("abc");

    const result = await apiRequest<{ echoed: unknown; auth: string }>(
      "POST",
      "/api/v1/things",
      { name: "x" },
    );

    expect(result).toEqual({ echoed: { name: "x" }, auth: "Bearer abc" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("omits the Authorization header when logged out", async () => {
    mockApi({
      "GET /api/v1/me": ({ headers }) =>
        Response.json({ auth: headers.Authorization ?? null }),
    });

    await expect(apiRequest("GET", "/api/v1/me")).resolves.toEqual({
      auth: null,
    });
  });

  it("turns error responses into ApiError with field errors", async () => {
    mockApi({
      "POST /api/v1/things": () =>
        apiError(400, "VALIDATION_FAILED", "Request validation failed", [
          { field: "email", message: "must be a well-formed email address" },
        ]),
    });

    const error = await rejection(apiRequest("POST", "/api/v1/things", {}));

    expect(error.status).toBe(400);
    expect(error.fieldErrors()).toEqual({
      email: "must be a well-formed email address",
    });
  });

  it("reports a network failure as status 0", async () => {
    mockApi({
      "GET /api/v1/me": () => {
        throw new TypeError("Failed to fetch");
      },
    });

    const error = await rejection(apiRequest("GET", "/api/v1/me"));

    expect(error.status).toBe(0);
    expect(error.body.code).toBe("NETWORK_ERROR");
  });

  it("handles an error response that is not JSON", async () => {
    mockApi({
      "GET /api/v1/me": () =>
        new Response("<html>Bad gateway</html>", { status: 502 }),
    });

    const error = await rejection(apiRequest("GET", "/api/v1/me"));

    expect(error.status).toBe(502);
    expect(error.body.code).toBe("UNKNOWN_ERROR");
  });

  it("reports a 401 on a request that carried a token (expired session)", async () => {
    mockApi({
      "GET /api/v1/me": () =>
        apiError(401, "UNAUTHORIZED", "Authentication required"),
    });
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    setAccessToken("expired");

    await rejection(apiRequest("GET", "/api/v1/me"));

    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not report a 401 for a request without a token (wrong password)", async () => {
    mockApi({
      "POST /api/v1/auth/login": () =>
        apiError(401, "INVALID_CREDENTIALS", "Invalid email or password"),
    });
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await rejection(apiRequest("POST", "/api/v1/auth/login", {}));

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("searchQuery (FR-03)", () => {
  it("repeats amenities and leaves out empty filters", () => {
    expect(
      searchQuery({
        neighborhood: "Capitol Hill",
        minPriceCents: 100000,
        maxPriceCents: undefined,
        amenities: ["WIFI", "KITCHEN"],
        sort: "price_asc",
        page: 0,
      }),
    ).toBe(
      "?neighborhood=Capitol+Hill&minPriceCents=100000&amenities=WIFI&amenities=KITCHEN&sort=price_asc&page=0",
    );
  });

  it("is empty when there are no filters", () => {
    expect(searchQuery({})).toBe("");
    expect(searchQuery({ neighborhood: "", amenities: [] })).toBe("");
  });
});
