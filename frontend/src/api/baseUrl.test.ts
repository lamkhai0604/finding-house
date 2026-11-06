import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchApiHealth } from "./health";
import { apiUrl } from "./baseUrl";
import { apiRequest } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("API base URL (T-114b)", () => {
  it("uses the page's own origin by default", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(apiUrl("/api/v1/me")).toBe("/api/v1/me");
  });

  it("prefixes the configured backend origin, ignoring a trailing slash", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/");

    expect(apiUrl("/api/v1/me")).toBe("https://api.example.test/api/v1/me");
  });

  it("sends API calls and the health check to the backend origin", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    const fetchMock = vi.fn(async () => Response.json({ status: "UP" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("GET", "/api/v1/reference-data");
    await fetchApiHealth();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.example.test/api/v1/reference-data",
      "https://api.example.test/actuator/health",
    ]);
  });
});
