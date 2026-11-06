import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { listingDetail } from "../test/fixtures";
import { mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

describe("page titles (T-208)", () => {
  it("names the home page after the site", async () => {
    mockApi({});
    renderApp("/");

    await screen.findByRole("heading", { name: "Find a room near your stop" });
    expect(document.title).toBe("Finding House: rooms for rent in Seattle");
  });

  it("names a page by what it shows", async () => {
    mockApi({});
    renderApp("/login");

    expect(document.title).toBe("Log in | Finding House");
  });

  it("uses the listing's title once it has loaded", async () => {
    mockApi({
      "GET /api/v1/listings/7": () =>
        Response.json(listingDetail({ id: 7, title: "Sunny studio" })),
    });
    renderApp("/listings/7");

    await screen.findByRole("heading", { name: "Sunny studio" });
    expect(document.title).toBe("Sunny studio | Finding House");
  });
});
