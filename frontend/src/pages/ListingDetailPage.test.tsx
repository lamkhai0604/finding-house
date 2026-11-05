import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { listingDetail } from "../test/fixtures";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

describe("Listing detail page (FR-04)", () => {
  it("shows the listing, its photos, amenities, and landlord contact", async () => {
    mockApi({ "GET /api/v1/listings/7": () => Response.json(listingDetail()) });
    renderApp("/listings/7");

    expect(
      await screen.findByRole("heading", { name: "Sunny studio near UW" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$1,650")).toBeInTheDocument();
    expect(screen.getByText("University District, Seattle · 420 sq ft")).toBeInTheDocument();
    expect(screen.getByText("4500 Sample Ave NE, Seattle, WA")).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("Pets allowed")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sunny studio near UW, photo 1" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sunny studio near UW, photo 2" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "(206) 555-0101" })).toHaveAttribute(
      "href",
      "tel:(206) 555-0101",
    );
  });

  it("shows a placeholder and friendly text when details are missing", async () => {
    mockApi({
      "GET /api/v1/listings/7": () =>
        Response.json(
          listingDetail(
            { imageUrls: [], amenities: [], description: "" },
            { displayName: "Lena Park", phone: null },
          ),
        ),
    });
    renderApp("/listings/7");

    expect(
      await screen.findByRole("img", { name: "No photo available" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No amenities listed.")).toBeInTheDocument();
    expect(screen.getByText("No phone number provided.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "About this place" })).not.toBeInTheDocument();
  });

  it("marks a hidden listing for its owner", async () => {
    mockApi({
      "GET /api/v1/listings/7": () => Response.json(listingDetail({ status: "HIDDEN" })),
    });
    renderApp("/listings/7");

    expect(await screen.findByText("Hidden — only you can see this")).toBeInTheDocument();
  });

  it("says 'not found' for a missing or hidden listing", async () => {
    mockApi({
      "GET /api/v1/listings/99": () => apiError(404, "NOT_FOUND", "Listing not found"),
    });
    renderApp("/listings/99");

    expect(
      await screen.findByRole("heading", { name: "Listing not found" }),
    ).toBeInTheDocument();
  });

  it("explains when the server cannot be reached", async () => {
    mockApi({
      "GET /api/v1/listings/7": () => {
        throw new TypeError("Failed to fetch");
      },
    });
    renderApp("/listings/7");

    expect(
      await screen.findByRole("heading", { name: "Could not load this listing" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Could not reach the server. Please try again.")).toBeInTheDocument();
  });
});
