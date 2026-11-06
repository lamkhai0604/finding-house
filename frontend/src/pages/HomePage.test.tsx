import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Listing, Page } from "../api/types";
import { TOKEN_STORAGE_KEY } from "../auth/session";
import { listingDetail } from "../test/fixtures";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

function page(items: Listing[]): Page<Listing> {
  return {
    items,
    page: 0,
    size: 8,
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
  };
}

const studio = listingDetail({ id: 7 }).listing;
const ballard = listingDetail({
  id: 9,
  title: "Ballard room by the locks",
  neighborhood: "Ballard",
  monthlyPriceCents: 120000,
  imageUrls: [],
}).listing;

describe("Home page newest rooms (T-122)", () => {
  it("asks for the 8 newest listings and links each slide to its page", async () => {
    const fetchMock = mockApi({
      "GET /api/v1/listings": () => Response.json(page([studio, ballard])),
    });
    renderApp("/");

    const carousel = await screen.findByRole("region", {
      name: "Newest rooms",
    });
    const slides = within(carousel).getAllByRole("listitem");
    expect(slides).toHaveLength(2);
    expect(
      within(slides[0]).getByRole("link", { name: /Sunny studio near UW/ }),
    ).toHaveAttribute("href", "/listings/7");
    expect(slides[0]).toHaveTextContent("$1,650/month · University District");
    expect(slides[1]).toHaveTextContent("$1,200/month · Ballard");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls).toContain("/api/v1/listings?sort=newest&size=8");
  });

  it("says so when nothing has been posted", async () => {
    mockApi({ "GET /api/v1/listings": () => Response.json(page([])) });
    renderApp("/");

    expect(
      await screen.findByText("No rooms have been posted yet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Newest rooms" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the page usable when the listings cannot be loaded", async () => {
    mockApi({
      "GET /api/v1/listings": () =>
        apiError(500, "INTERNAL_ERROR", "Something went wrong"),
    });
    renderApp("/");

    expect(
      await screen.findByText(/Could not load the newest rooms/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Find a room in Seattle" }),
    ).toBeInTheDocument();
  });

  it("waits for an expired stored token to be dropped before loading", async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "expired");
    const authHeaders: (string | undefined)[] = [];
    mockApi({
      "GET /api/v1/me": () =>
        apiError(401, "UNAUTHORIZED", "Authentication required"),
      "GET /api/v1/listings": ({ headers }) => {
        authHeaders.push(headers.Authorization);
        return headers.Authorization
          ? apiError(401, "UNAUTHORIZED", "Authentication required")
          : Response.json(page([studio]));
      },
    });
    renderApp("/");

    const carousel = await screen.findByRole("region", {
      name: "Newest rooms",
    });
    expect(within(carousel).getAllByRole("listitem")).toHaveLength(1);
    expect(authHeaders).toEqual([undefined]);
  });

  it("offers one main action; sign-in lives in the header (T-207)", async () => {
    mockApi({ "GET /api/v1/listings": () => Response.json(page([])) });
    renderApp("/");

    const hero = (
      await screen.findByRole("heading", { name: "Find a room in Seattle" })
    ).closest("section")!;
    expect(within(hero).getAllByRole("link")).toHaveLength(1);
    expect(within(hero).getByRole("link", { name: "Browse rooms" })).toHaveAttribute(
      "href",
      "/browse",
    );
  });
});
