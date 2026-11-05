import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Listing, UserProfile } from "../api/types";
import { TOKEN_STORAGE_KEY } from "../auth/session";
import { landlordMaya, listingDetail } from "../test/fixtures";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

const REFERENCE_DATA = {
  city: "Seattle",
  neighborhoods: ["Ballard", "Capitol Hill", "University District"],
  amenities: ["WIFI", "KITCHEN", "PETS_ALLOWED"],
};

function loggedInAs(user: UserProfile) {
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
  return { "GET /api/v1/me": () => Response.json(user) };
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

const tenantAlex: UserProfile = {
  id: 2,
  email: "alex.tenant@example.com",
  displayName: "Alex Nguyen",
  role: "TENANT",
  phone: null,
};

describe("Post a room (FR-02)", () => {
  it("sends a complete listing, with the price in cents, and opens it", async () => {
    let sent: unknown;
    mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/reference-data": () => Response.json(REFERENCE_DATA),
      "POST /api/v1/listings": ({ body }) => {
        sent = body;
        return Response.json(listingDetail({ id: 42 }).listing, {
          status: 201,
        });
      },
      "GET /api/v1/listings/42": () =>
        Response.json(listingDetail({ id: 42, title: "Cozy room" })),
    });
    renderApp("/listings/new");

    await screen.findByRole("heading", { name: "Post a room" });
    fill("Title", "Cozy room");
    fill("Monthly rent (USD)", "$1,995.50");
    fill("Area (sq ft)", "300");
    fill("Neighborhood", "Ballard");
    fill("Street address", "1 Sample St");
    fill("Description (optional)", "Near the park");
    fireEvent.click(screen.getByLabelText("Pets allowed"));
    fireEvent.click(screen.getByLabelText("Wi-Fi"));
    fireEvent.click(screen.getByRole("button", { name: "Add photo link" }));
    fill("Photo link 1", "https://example.com/room.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Post listing" }));

    expect(
      await screen.findByRole("heading", { name: "Cozy room" }),
    ).toBeInTheDocument();
    expect(sent).toEqual({
      title: "Cozy room",
      description: "Near the park",
      monthlyPriceCents: 199550,
      areaSqft: 300,
      neighborhood: "Ballard",
      address: "1 Sample St",
      amenities: ["WIFI", "PETS_ALLOWED"],
      imageUrls: ["https://example.com/room.jpg"],
    });
  });

  it("checks fields before sending", async () => {
    const fetchMock = mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/reference-data": () => Response.json(REFERENCE_DATA),
    });
    renderApp("/listings/new");

    await screen.findByRole("heading", { name: "Post a room" });
    fill("Title", "Hi");
    fill("Monthly rent (USD)", "a lot");
    fireEvent.click(screen.getByRole("button", { name: "Add photo link" }));
    fill("Photo link 1", "http://example.com/a.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Post listing" }));

    expect(screen.getByText("Use at least 5 characters")).toBeInTheDocument();
    expect(
      screen.getByText("Enter a monthly rent such as 1650 or 1650.50"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enter a whole number of square feet"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Neighborhood")).toHaveAccessibleDescription(
      "Choose a neighborhood",
    );
    expect(
      screen.getByText("Use a link that starts with https://"),
    ).toBeInTheDocument();
    const posts = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(posts).toHaveLength(0);
  });

  it("shows the server's field errors next to the right fields", async () => {
    mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/reference-data": () => Response.json(REFERENCE_DATA),
      "POST /api/v1/listings": () =>
        apiError(400, "VALIDATION_FAILED", "Request validation failed", [
          {
            field: "monthlyPriceCents",
            message: "must be less than or equal to 10000000",
          },
          {
            field: "imageUrls[0]",
            message: "must be an absolute https:// URL",
          },
        ]),
    });
    renderApp("/listings/new");

    await screen.findByRole("heading", { name: "Post a room" });
    fill("Title", "Mansion room");
    fill("Monthly rent (USD)", "999999");
    fill("Area (sq ft)", "300");
    fill("Neighborhood", "Ballard");
    fill("Street address", "1 Sample St");
    fireEvent.click(screen.getByRole("button", { name: "Add photo link" }));
    fill("Photo link 1", "https://");
    fireEvent.click(screen.getByRole("button", { name: "Post listing" }));

    expect(
      await screen.findByText("must be less than or equal to 10000000"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Monthly rent (USD)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Photo link 1")).toHaveAccessibleDescription(
      "must be an absolute https:// URL",
    );
  });
});

describe("Edit a listing (FR-02)", () => {
  it("starts from the current values and saves with PUT", async () => {
    let sent: { monthlyPriceCents?: number; title?: string } = {};
    mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/reference-data": () => Response.json(REFERENCE_DATA),
      "GET /api/v1/listings/7": () => Response.json(listingDetail()),
      "PUT /api/v1/listings/7": ({ body }) => {
        sent = body as typeof sent;
        return Response.json(listingDetail().listing);
      },
    });
    renderApp("/listings/7/edit");

    await screen.findByRole("heading", { name: "Edit listing" });
    expect(screen.getByLabelText("Title")).toHaveValue("Sunny studio near UW");
    expect(screen.getByLabelText("Monthly rent (USD)")).toHaveValue("1650");
    expect(screen.getByLabelText("Neighborhood")).toHaveValue(
      "University District",
    );
    expect(screen.getByLabelText("Wi-Fi")).toBeChecked();
    expect(screen.getByLabelText("Photo link 2")).toHaveValue(
      "https://example.com/2.jpg",
    );

    fill("Monthly rent (USD)", "1700");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(sent.monthlyPriceCents).toBe(170000));
    expect(sent.title).toBe("Sunny studio near UW");
  });

  it("does not offer to edit someone else's listing", async () => {
    mockApi({
      ...loggedInAs({ ...landlordMaya, id: 99 }),
      "GET /api/v1/reference-data": () => Response.json(REFERENCE_DATA),
      "GET /api/v1/listings/7": () => Response.json(listingDetail()),
    });
    renderApp("/listings/7/edit");

    expect(
      await screen.findByRole("heading", { name: "Listing not found" }),
    ).toBeInTheDocument();
  });
});

describe("Landlord-only pages", () => {
  it("send anonymous visitors to the login page", async () => {
    mockApi({});
    renderApp("/listings/new");

    expect(
      await screen.findByRole("heading", { name: "Log in" }),
    ).toBeInTheDocument();
  });

  it("explain to tenants that the page is for landlords", async () => {
    mockApi(loggedInAs(tenantAlex));
    renderApp("/my/listings");

    expect(
      await screen.findByRole("heading", { name: "Landlords only" }),
    ).toBeInTheDocument();
  });
});

describe("My listings (FR-02 AC3, AC6)", () => {
  const active: Listing = listingDetail({
    id: 1,
    title: "Active room",
  }).listing;
  const hidden: Listing = listingDetail({
    id: 2,
    title: "Hidden room",
    status: "HIDDEN",
    imageUrls: [],
  }).listing;

  it("lists own listings with status and toggles hide/unhide", async () => {
    mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/me/listings": () => Response.json([active, hidden]),
      "PATCH /api/v1/listings/1/status": ({ body }) =>
        Response.json({ ...active, ...(body as object) }),
    });
    renderApp("/my/listings");

    const activeCard = (
      await screen.findByRole("link", { name: "Active room" })
    ).closest("article")!;
    const hiddenCard = screen
      .getByRole("link", { name: "Hidden room" })
      .closest("article")!;
    expect(within(hiddenCard).getByText("Hidden")).toBeInTheDocument();
    expect(
      within(hiddenCard).getByRole("button", { name: "Unhide" }),
    ).toBeInTheDocument();

    fireEvent.click(within(activeCard).getByRole("button", { name: "Hide" }));

    expect(
      await within(activeCard).findByRole("button", { name: "Unhide" }),
    ).toBeInTheDocument();
    expect(within(activeCard).getByText("Hidden")).toBeInTheDocument();
  });

  it("invites the landlord to post when there are no listings", async () => {
    mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/me/listings": () => Response.json([]),
    });
    renderApp("/my/listings");

    expect(
      await screen.findByRole("heading", { name: "No listings yet" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Post a room" })).toHaveAttribute(
      "href",
      "/listings/new",
    );
  });
});
