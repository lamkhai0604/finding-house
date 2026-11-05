import { describe, expect, it } from "vitest";
import { apiError, mockApi } from "../test/mockApi";
import { ApiError, apiRequest, setAccessToken } from "./client";

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

    const error = await apiRequest("POST", "/api/v1/things", {}).catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
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

    const error = await apiRequest("GET", "/api/v1/me").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.body.code).toBe("NETWORK_ERROR");
  });

  it("handles an error response that is not JSON", async () => {
    mockApi({
      "GET /api/v1/me": () =>
        new Response("<html>Bad gateway</html>", { status: 502 }),
    });

    const error = await apiRequest("GET", "/api/v1/me").catch((e) => e);

    expect(error.status).toBe(502);
    expect(error.body.code).toBe("UNKNOWN_ERROR");
  });
});
