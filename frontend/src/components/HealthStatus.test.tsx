import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthStatus } from "./HealthStatus";

function stubFetch(implementation: () => Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(implementation));
}

describe("HealthStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows 'up' when the backend reports UP", async () => {
    stubFetch(async () => Response.json({ status: "UP" }));

    render(<HealthStatus />);

    expect(await screen.findByText("API is up")).toBeInTheDocument();
  });

  it("shows 'down' when the backend reports another status", async () => {
    stubFetch(async () => Response.json({ status: "DOWN" }, { status: 503 }));

    render(<HealthStatus />);

    expect(await screen.findByText("API is down")).toBeInTheDocument();
  });

  it("shows 'unreachable' when the request fails", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    render(<HealthStatus />);

    expect(await screen.findByText("API is unreachable")).toBeInTheDocument();
  });
});
