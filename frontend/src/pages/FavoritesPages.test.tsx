import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Listing, Page, UserProfile } from "../api/types";
import { TOKEN_STORAGE_KEY } from "../auth/session";
import { landlordMaya, listingDetail } from "../test/fixtures";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

const tenantAlex: UserProfile = {
  id: 2,
  email: "alex.tenant@example.com",
  displayName: "Alex Nguyen",
  role: "TENANT",
  phone: null,
};

const studio = listingDetail({ id: 7, title: "Sunny studio" }).listing;
const loft = listingDetail({ id: 8, title: "Ballard loft" }).listing;

function page(items: Listing[]): Page<Listing> {
  return { items, page: 0, size: 12, totalItems: items.length, totalPages: 1 };
}

function loggedInAs(user: UserProfile) {
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
  return { "GET /api/v1/me": () => Response.json(user) };
}

const REFERENCE_DATA = {
  city: "Seattle",
  neighborhoods: ["Ballard"],
  amenities: ["WIFI"],
};

describe("Saving rooms (FR-06, T-403)", () => {
  it("lets a tenant save a room from the browse page", async () => {
    const calls: string[] = [];
    mockApi({
      ...loggedInAs(tenantAlex),
      "GET /api/v1/reference-data": () => Response.json(REFERENCE_DATA),
      "GET /api/v1/listings": () => Response.json(page([studio, loft])),
      "GET /api/v1/me/favorites/ids": () => Response.json([8]),
      "PUT /api/v1/me/favorites/7": () => {
        calls.push("PUT 7");
        return new Response(null, { status: 204 });
      },
    });
    renderApp("/browse");

    const save = await screen.findByRole("button", {
      name: "Save Sunny studio",
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save Ballard loft" }),
      ).toHaveAttribute("aria-pressed", "true"),
    );
    expect(save).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(save);

    await waitFor(() => expect(save).toHaveAttribute("aria-pressed", "true"));
    expect(save).toHaveTextContent("Saved");
    expect(calls).toEqual(["PUT 7"]);
  });

  it("puts the heart back and explains when saving fails", async () => {
    mockApi({
      ...loggedInAs(tenantAlex),
      "GET /api/v1/listings/7": () => Response.json(listingDetail({ id: 7 })),
      "GET /api/v1/me/favorites/ids": () => Response.json([]),
      "PUT /api/v1/me/favorites/7": () =>
        apiError(400, "VALIDATION_FAILED", "You can save at most 200 rooms"),
    });
    renderApp("/listings/7");

    const save = await screen.findByRole("button", { name: /^Save / });
    fireEvent.click(save);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can save at most 200 rooms",
    );
    expect(save).toHaveAttribute("aria-pressed", "false");
  });

  it("lists saved rooms and drops one when it is unsaved", async () => {
    mockApi({
      ...loggedInAs(tenantAlex),
      "GET /api/v1/me/favorites": () => Response.json([studio, loft]),
      "GET /api/v1/me/favorites/ids": () => Response.json([7, 8]),
      "DELETE /api/v1/me/favorites/8": () =>
        new Response(null, { status: 204 }),
    });
    renderApp("/my/saved");

    expect(
      await screen.findByRole("heading", { name: "Saved rooms" }),
    ).toBeInTheDocument();
    const unsave = await screen.findByRole("button", {
      name: "Save Ballard loft",
      pressed: true,
    });
    fireEvent.click(unsave);

    await waitFor(() =>
      expect(screen.queryByText("Ballard loft")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Sunny studio")).toBeInTheDocument();
  });

  it("shows an empty state when nothing is saved", async () => {
    mockApi({
      ...loggedInAs(tenantAlex),
      "GET /api/v1/me/favorites": () => Response.json([]),
      "GET /api/v1/me/favorites/ids": () => Response.json([]),
    });
    renderApp("/my/saved");

    expect(
      await screen.findByRole("heading", { name: "No saved rooms yet" }),
    ).toBeInTheDocument();
  });

  it("asks visitors to log in, and returns them to the same page", async () => {
    mockApi({
      "GET /api/v1/listings/7": () => Response.json(listingDetail({ id: 7 })),
    });
    renderApp("/listings/7");

    const link = await screen.findByRole("link", {
      name: /^Log in to save /,
    });
    fireEvent.click(link);

    expect(
      await screen.findByRole("heading", { name: "Log in" }),
    ).toBeInTheDocument();
  });

  it("shows no save button to landlords", async () => {
    mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/listings/7": () =>
        Response.json(listingDetail({ id: 7, landlordId: 99 })),
    });
    renderApp("/listings/7");

    await screen.findByRole("heading", { name: "Sunny studio near UW" });
    expect(screen.queryByRole("button", { name: /^Save / })).toBeNull();
    expect(screen.queryByRole("link", { name: /save/i })).toBeNull();
  });

  it("links tenants to their saved rooms from the account menu", async () => {
    mockApi({
      ...loggedInAs(tenantAlex),
      "GET /api/v1/me/favorites/ids": () => Response.json([]),
    });
    renderApp("/");

    fireEvent.click(
      await within(screen.getByRole("banner")).findByRole("button", {
        name: /Account menu/,
      }),
    );

    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Saved rooms",
      }),
    ).toHaveAttribute("href", "/my/saved");
  });
});
