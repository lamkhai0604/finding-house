import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Listing, Page } from "../api/types";
import { listingDetail } from "../test/fixtures";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

const REFERENCE_DATA = {
  city: "Seattle",
  neighborhoods: ["Ballard", "Capitol Hill", "University District"],
  amenities: ["WIFI", "KITCHEN", "PETS_ALLOWED"],
};

function listing(id: number, title: string): Listing {
  return listingDetail({ id, title }).listing;
}

function page(
  items: Listing[],
  {
    totalItems = items.length,
    totalPages = items.length ? 1 : 0,
    number = 0,
  } = {},
): Page<Listing> {
  return { items, page: number, size: 12, totalItems, totalPages };
}

/** Fake backend that records each browse query string and answers with `respond`. */
function browseApi(respond: (query: string) => Response) {
  const queries: string[] = [];
  mockApi({
    "GET /api/v1/reference-data": () => Response.json(REFERENCE_DATA),
    "GET /api/v1/listings": ({ url }) => {
      queries.push(url.search);
      return respond(url.search);
    },
  });
  return queries;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function results() {
  return screen
    .getByRole("heading", { name: "Browse rooms" })
    .closest("section")!
    .querySelector<HTMLElement>(".browse-results")!;
}

describe("Browse rooms (FR-03, T-202)", () => {
  it("shows the newest rooms first, 12 per page, each linking to its page", async () => {
    const queries = browseApi(() =>
      Response.json(
        page([listing(7, "Sunny studio"), listing(8, "Quiet room")]),
      ),
    );
    renderApp("/browse");

    expect(await screen.findByText("2 rooms found")).toBeInTheDocument();
    expect(queries).toEqual(["?sort=newest&page=0&size=12"]);
    expect(
      within(results()).getByRole("link", { name: "Sunny studio" }),
    ).toHaveAttribute("href", "/listings/7");
  });

  it("sends every filter the visitor sets, in cents", async () => {
    const queries = browseApi(() => Response.json(page([listing(7, "Match")])));
    renderApp("/browse");
    await screen.findByText("1 room found");
    await screen.findByRole("option", { name: "Ballard" });

    fill("Neighborhood", "Ballard");
    fill("Min rent", "1,000");
    fill("Max rent", "2000.50");
    fill("Min area", "200");
    fireEvent.click(screen.getByLabelText("Wi-Fi"));
    fill("Sort by", "price_asc");
    fireEvent.click(screen.getByRole("button", { name: "Show rooms" }));

    await waitFor(() => expect(queries).toHaveLength(2));
    expect(await screen.findByText("1 room found")).toBeInTheDocument();
    expect(screen.getByLabelText("Max rent")).toHaveValue("2,000.50");
    expect(queries.at(-1)).toBe(
      "?neighborhood=Ballard&minPriceCents=100000&maxPriceCents=200050&minAreaSqft=200&amenities=WIFI&sort=price_asc&page=0&size=12",
    );
  });

  it("explains invalid filters instead of searching", async () => {
    const queries = browseApi(() => Response.json(page([listing(7, "A")])));
    renderApp("/browse");
    await screen.findByText("1 room found");

    fill("Min rent", "2000");
    fill("Max rent", "1500");
    fireEvent.click(screen.getByRole("button", { name: "Show rooms" }));

    expect(
      await screen.findByText("Must be at least the minimum price."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Max rent")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(queries).toHaveLength(1);
  });

  it("opens a shared link with its filters filled in", async () => {
    const queries = browseApi(() =>
      Response.json(
        page([listing(9, "Ballard room")], {
          totalItems: 13,
          totalPages: 2,
          number: 1,
        }),
      ),
    );
    renderApp(
      "/browse?neighborhood=Ballard&minPrice=1000&amenities=WIFI&page=2",
    );

    expect(await screen.findByText("13 rooms found")).toBeInTheDocument();
    expect(queries).toEqual([
      "?neighborhood=Ballard&minPriceCents=100000&amenities=WIFI&sort=newest&page=1&size=12",
    ]);
    expect(screen.getByLabelText("Min rent")).toHaveValue("1,000");
    expect(screen.getByLabelText("Wi-Fi")).toBeChecked();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("does not search for an invalid shared link", async () => {
    const queries = browseApi(() => Response.json(page([])));
    renderApp("/browse?minPrice=lots&amenities=POOL");

    expect(
      await screen.findByText(/Some filters are not valid/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enter an amount in dollars, like 1200."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Unknown amenity in the link: POOL"),
    ).toBeInTheDocument();
    expect(queries).toEqual([]);
  });

  it("moves between pages and keeps the filters", async () => {
    const queries = browseApi((query) => {
      const number = Number(new URLSearchParams(query).get("page"));
      return Response.json(
        page([listing(10 + number, `Room on page ${number + 1}`)], {
          totalItems: 30,
          totalPages: 3,
          number,
        }),
      );
    });
    renderApp("/browse?sort=price_desc");
    await screen.findByText("Room on page 1");

    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));

    expect(await screen.findByText("Room on page 2")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(queries.at(-1)).toBe("?sort=price_desc&page=1&size=12");
  });

  it("says when nothing matches, and Clear filters starts over", async () => {
    const queries = browseApi((query) =>
      Response.json(
        query.includes("neighborhood")
          ? page([])
          : page([listing(7, "Anything")]),
      ),
    );
    renderApp("/browse?neighborhood=Ballard");

    expect(
      await screen.findByRole("heading", {
        name: "No rooms match these filters",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(await screen.findByText("1 room found")).toBeInTheDocument();
    expect(queries.at(-1)).toBe("?sort=newest&page=0&size=12");
    expect(screen.getByLabelText("Neighborhood")).toHaveValue("");
  });

  it("says nothing has been posted when there are no filters (T-207)", async () => {
    browseApi(() => Response.json(page([])));
    renderApp("/browse");

    expect(
      await screen.findByRole("heading", {
        name: "No rooms have been posted yet",
      }),
    ).toBeInTheDocument();
  });

  it("shows the server's reason when it rejects a filter", async () => {
    browseApi(() =>
      apiError(400, "VALIDATION_FAILED", "Invalid request", [
        { field: "neighborhood", message: "unknown neighborhood: Atlantis" },
      ]),
    );
    renderApp("/browse?neighborhood=Atlantis");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "neighborhood: unknown neighborhood: Atlantis",
    );
  });

  it("folds the filters behind a button on small screens (T-205)", async () => {
    browseApi(() => Response.json(page([listing(7, "A")])));
    renderApp("/browse?neighborhood=Ballard&amenities=WIFI");
    await screen.findByText("1 room found");

    const toggle = screen.getByRole("button", {
      name: "Filters (2 active)",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "browse-filters");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Hide filters (2 active)");

    // Applying new filters folds the panel again.
    fill("Min rent", "900");
    fireEvent.click(screen.getByRole("button", { name: "Show rooms" }));
    expect(
      await screen.findByRole("button", { name: "Filters (3 active)" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the filters open while they are invalid (T-205)", async () => {
    browseApi(() => Response.json(page([])));
    renderApp("/browse?minPrice=lots");

    expect(
      await screen.findByRole("button", { name: /Hide filters/ }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("is linked from the header", async () => {
    browseApi(() => Response.json(page([])));
    renderApp("/");

    fireEvent.click(
      within(screen.getByRole("banner")).getByRole("link", {
        name: "Browse rooms",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Browse rooms" }),
    ).toBeInTheDocument();
  });
});
