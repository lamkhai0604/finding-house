import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Listing, NeighborhoodStats, Page } from "../api/types";
import { TOKEN_STORAGE_KEY } from "../auth/session";
import { isNew } from "../components/TicketCard";
import { listingDetail } from "../test/fixtures";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";
import { LINE_STOPS } from "./HomePage";

function page(items: Listing[]): Page<Listing> {
  return {
    items,
    page: 0,
    size: 4,
    totalItems: items.length,
    totalPages: items.length ? 1 : 0,
  };
}

const studio = listingDetail({ id: 7, amenities: ["WIFI", "FURNISHED"] })
  .listing;
const ballard = listingDetail({
  id: 9,
  title: "Ballard room by the locks",
  neighborhood: "Ballard",
  monthlyPriceCents: 120000,
  imageUrls: [],
}).listing;

const STATS: NeighborhoodStats[] = [
  { neighborhood: "Ballard", activeListings: 3, lowestMonthlyPriceCents: 95000 },
  {
    neighborhood: "Capitol Hill",
    activeListings: 1,
    lowestMonthlyPriceCents: 145000,
  },
  {
    neighborhood: "University District",
    activeListings: 12,
    lowestMonthlyPriceCents: 89900,
  },
  { neighborhood: "Roosevelt", activeListings: 0, lowestMonthlyPriceCents: null },
];

describe("Home page: just posted (T-122, T-210)", () => {
  it("asks for the 4 newest listings and shows each as a ticket linking to its page", async () => {
    const fetchMock = mockApi({
      "GET /api/v1/listings": () => Response.json(page([studio, ballard])),
    });
    renderApp("/");

    const section = await screen.findByRole("region", { name: "Just posted" });
    const tickets = await within(section).findAllByRole("article");
    expect(tickets).toHaveLength(2);
    expect(
      within(tickets[0]).getByRole("link", { name: "Sunny studio near UW" }),
    ).toHaveAttribute("href", "/listings/7");
    expect(tickets[0]).toHaveTextContent("$1,650 a month");
    expect(tickets[0]).toHaveTextContent("University District/420 sq ft");
    expect(
      within(tickets[0]).getByRole("list", { name: "Amenities" }),
    ).toHaveTextContent("Wi-FiFurnished");
    expect(tickets[1]).toHaveTextContent("$1,200 a month");

    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls).toContain("/api/v1/listings?sort=newest&size=4");
  });

  it("says so when nothing has been posted", async () => {
    mockApi({ "GET /api/v1/listings": () => Response.json(page([])) });
    renderApp("/");

    expect(
      await screen.findByText("No rooms have been posted yet."),
    ).toBeInTheDocument();
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
      screen.getByRole("heading", { name: "Find a room near your stop" }),
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
      "GET /api/v1/neighborhoods": ({ headers }) => {
        authHeaders.push(headers.Authorization);
        return Response.json(STATS);
      },
    });
    renderApp("/");

    const section = await screen.findByRole("region", { name: "Just posted" });
    expect(await within(section).findAllByRole("article")).toHaveLength(1);
    expect(authHeaders).toEqual([undefined, undefined]);
  });

  it("marks rooms posted in the last week as new", () => {
    const now = Date.parse("2026-11-10T00:00:00Z");
    expect(isNew({ ...studio, createdAt: "2026-11-05T10:00:00Z" }, now)).toBe(
      true,
    );
    expect(isNew({ ...studio, createdAt: "2026-11-01T10:00:00Z" }, now)).toBe(
      false,
    );
  });
});

describe("Home page: the 1 Line (T-210)", () => {
  it("lists the stops north to south with real room counts and lowest rent", async () => {
    mockApi({
      "GET /api/v1/listings": () => Response.json(page([])),
      "GET /api/v1/neighborhoods": () => Response.json(STATS),
    });
    renderApp("/");

    const line = await screen.findByRole("region", {
      name: "Rooms along the 1 Line",
    });
    const stops = within(line).getAllByRole("link");
    expect(stops.map((s) => s.querySelector("strong")?.textContent)).toEqual(
      LINE_STOPS.map((s) => s.label),
    );
    expect(
      await within(line).findByRole("link", { name: /U District/ }),
    ).toHaveTextContent("12 rooms");
    expect(
      within(line).getByRole("link", { name: /U District/ }),
    ).toHaveTextContent("from $899");
    expect(
      within(line).getByRole("link", { name: /Capitol Hill/ }),
    ).toHaveTextContent("1 room");
    expect(
      within(line).getByRole("link", { name: /Roosevelt/ }),
    ).toHaveTextContent("No rooms yet");
    expect(
      within(line).getByRole("link", { name: /Northgate/ }),
    ).toHaveAttribute("href", "/browse?neighborhood=Northgate");
    expect(
      within(line).getByRole("link", { name: /U District/ }),
    ).toHaveAttribute("href", "/browse?neighborhood=University+District");
  });

  it("keeps the stops when the counts cannot be loaded", async () => {
    mockApi({
      "GET /api/v1/listings": () => Response.json(page([])),
      "GET /api/v1/neighborhoods": () =>
        apiError(500, "INTERNAL_ERROR", "Something went wrong"),
    });
    renderApp("/");

    const line = await screen.findByRole("region", {
      name: "Rooms along the 1 Line",
    });
    expect(
      await within(line).findByText(/Room counts are not available/),
    ).toBeInTheDocument();
    expect(within(line).getAllByRole("link")).toHaveLength(LINE_STOPS.length);
  });
});

describe("Home page: search (T-210)", () => {
  it("opens browse with the chosen neighborhood and max rent", async () => {
    const fetchMock = mockApi({
      "GET /api/v1/listings": () => Response.json(page([])),
      "GET /api/v1/neighborhoods": () => Response.json(STATS),
      "GET /api/v1/reference-data": () =>
        Response.json({
          city: "Seattle",
          neighborhoods: ["Ballard", "Capitol Hill"],
          amenities: ["WIFI"],
        }),
    });
    renderApp("/");

    const form = screen.getByRole("form", { name: "Search rooms" });
    const select = within(form).getByLabelText("Neighborhood");
    await within(select).findByRole("option", { name: "Ballard" });
    fireEvent.change(select, { target: { value: "Capitol Hill" } });
    fireEvent.change(within(form).getByLabelText("Max rent per month"), {
      target: { value: "1500" },
    });
    fireEvent.click(within(form).getByRole("button", { name: "Search rooms" }));

    expect(
      await screen.findByRole("heading", { name: "Browse rooms" }),
    ).toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(
      urls.some(
        (url) =>
          url.startsWith("/api/v1/listings?") &&
          url.includes("neighborhood=Capitol+Hill") &&
          url.includes("maxPriceCents=150000"),
      ),
    ).toBe(true);
  });
});
