import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOKEN_STORAGE_KEY } from "../auth/session";
import { landlordMaya, listingDetail } from "../test/fixtures";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

describe("Listing detail page (FR-04)", () => {
  it("shows the listing, its photos, amenities, and landlord contact", async () => {
    mockApi({ "GET /api/v1/listings/7": () => Response.json(listingDetail()) });
    renderApp("/listings/7");

    expect(
      await screen.findByRole("heading", { name: "Sunny studio near UW" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("University District, Seattle"),
    ).toBeInTheDocument();
    const facts = screen.getByText("Rent").closest("dl")!;
    expect(facts).toHaveTextContent("Rent$1,650");
    expect(facts).toHaveTextContent("Area420 sq ft");
    expect(
      screen.getByText("4500 Sample Ave NE, Seattle, WA"),
    ).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("Pets allowed")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Sunny studio near UW, photo 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Sunny studio near UW, photo 2" }),
    ).toBeInTheDocument();
    const contact = screen.getByRole("complementary", { name: "Contact" });
    expect(contact).toHaveTextContent("$1,650 a month");
    expect(contact).toHaveTextContent("Maya Chen");
    expect(
      within(contact).getByRole("link", { name: "Call (206) 555-0101" }),
    ).toHaveAttribute("href", "tel:(206) 555-0101");
    // T-216: the phone-only bar repeats the price and the call link.
    const bar = screen.getByRole("region", { name: "Quick contact" });
    expect(bar).toHaveTextContent("$1,650 a month");
    expect(within(bar).getByRole("link", { name: "Call" })).toHaveAttribute(
      "href",
      "tel:(206) 555-0101",
    );
  });

  it("shows the neighboring 1 Line stops, or says there is no station (T-212)", async () => {
    mockApi({ "GET /api/v1/listings/7": () => Response.json(listingDetail()) });
    renderApp("/listings/7");

    const stops = await screen.findByRole("list", {
      name: "Nearby 1 Line stops",
    });
    expect(
      within(stops)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Roosevelt", "U District", "Capitol Hill"]);
    expect(within(stops).getByText("U District").closest("li")).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("does not invent transit for a neighborhood without a station (T-212)", async () => {
    mockApi({
      "GET /api/v1/listings/7": () =>
        Response.json(listingDetail({ neighborhood: "Ballard" })),
    });
    renderApp("/listings/7");

    expect(
      await screen.findByText(/Ballard has no 1 Line station/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Nearby 1 Line stops" }),
    ).not.toBeInTheDocument();
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
    expect(
      within(screen.getByRole("region", { name: "Quick contact" })).queryByRole(
        "link",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "About this place" }),
    ).not.toBeInTheDocument();
  });

  it("marks a hidden listing for its owner", async () => {
    mockApi({
      "GET /api/v1/listings/7": () =>
        Response.json(listingDetail({ status: "HIDDEN" })),
    });
    renderApp("/listings/7");

    expect(
      await screen.findByText("Hidden — only you can see this"),
    ).toBeInTheDocument();
  });

  it("lets the owner open their hidden listing directly after a page reload", async () => {
    // Regression: the page used to fetch before the session restored the token, so the
    // server treated the owner as a stranger (smoke run 42115177435, check 06).
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "owner-token");
    mockApi({
      "GET /api/v1/me": () => Response.json(landlordMaya),
      "GET /api/v1/listings/7": ({ headers }) =>
        headers.Authorization === "Bearer owner-token"
          ? Response.json(listingDetail({ status: "HIDDEN" }))
          : apiError(404, "NOT_FOUND", "Listing not found"),
    });
    renderApp("/listings/7");

    expect(
      await screen.findByText("Hidden — only you can see this"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Edit this listing" }),
    ).toBeInTheDocument();
  });

  it("says 'not found' for a missing or hidden listing", async () => {
    mockApi({
      "GET /api/v1/listings/99": () =>
        apiError(404, "NOT_FOUND", "Listing not found"),
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
      await screen.findByRole("heading", {
        name: "Could not load this listing",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Could not reach the server. Please try again."),
    ).toBeInTheDocument();
  });
});
