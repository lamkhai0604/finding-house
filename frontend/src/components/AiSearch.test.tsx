import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Interpretation } from "../api/aiSearch";
import type { Listing, Page } from "../api/types";
import { resetAiSearchAvailability } from "../ai/aiSearch";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

const REFERENCE = {
  city: "Seattle",
  neighborhoods: ["Ballard", "Capitol Hill"],
  amenities: ["WIFI", "WASHING_MACHINE", "KITCHEN"],
};

function emptyPage(): Page<Listing> {
  return { items: [], page: 0, size: 12, totalItems: 0, totalPages: 0 };
}

function routes(interpret: (body: unknown) => Response, available = true) {
  const sent: unknown[] = [];
  const browse: string[] = [];
  const fetchMock = mockApi({
    "GET /api/v1/search/interpret": () => Response.json({ available }),
    "POST /api/v1/search/interpret": ({ body }) => {
      sent.push(body);
      return interpret(body);
    },
    "GET /api/v1/listings": ({ url }) => {
      browse.push(url.search);
      return Response.json(emptyPage());
    },
    "GET /api/v1/reference-data": () => Response.json(REFERENCE),
  });
  return { sent, browse, fetchMock };
}

const CAP_HILL: Interpretation = {
  understood: true,
  filters: {
    neighborhood: "Capitol Hill",
    minPriceCents: null,
    maxPriceCents: 130050,
    minAreaSqft: null,
    amenities: ["WASHING_MACHINE"],
  },
  notes: ["Left out an amenity we do not list."],
};

async function ask(text: string) {
  const box = await screen.findByRole("search", {
    name: "Describe the room you want",
  });
  fireEvent.change(within(box).getByRole("textbox"), {
    target: { value: text },
  });
  fireEvent.click(within(box).getByRole("button", { name: "Ask" }));
  return box;
}

describe("AI search (T-303)", () => {
  beforeEach(() => resetAiSearchAvailability());

  it("is hidden when the API says AI search is off", async () => {
    routes(() => Response.json(CAP_HILL), false);
    renderApp("/");

    await screen.findByRole("heading", { name: "Find a room near your stop" });
    await waitFor(() =>
      expect(
        screen.queryByRole("search", { name: "Describe the room you want" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("opens browse with the filters it read, shows them as chips, and explains", async () => {
    const { sent, browse } = routes(() => Response.json(CAP_HILL));
    renderApp("/");

    await ask("  laundry room in cap hill under 1300.50 ");

    expect(
      await screen.findByRole("heading", { name: "Browse rooms" }),
    ).toBeInTheDocument();
    expect(sent).toEqual([{ query: "laundry room in cap hill under 1300.50" }]);
    await waitFor(() =>
      expect(browse.at(-1)).toBe(
        "?neighborhood=Capitol+Hill&maxPriceCents=130050&amenities=WASHING_MACHINE&sort=newest&page=0&size=12",
      ),
    );
    const chips = screen.getByRole("list", { name: "Filters in use" });
    expect(
      within(chips)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Capitol Hill×", "Up to $1,300.50×", "Washing machine×"]);
    const note = screen.getByText(/Rooms for “laundry room in cap hill/);
    expect(note.closest("div")).toHaveTextContent(
      "Left out an amenity we do not list.",
    );

    // Removing a chip searches again without it.
    fireEvent.click(
      within(chips).getByRole("button", { name: "Remove Capitol Hill" }),
    );
    await waitFor(() =>
      expect(browse.at(-1)).toBe(
        "?maxPriceCents=130050&amenities=WASHING_MACHINE&sort=newest&page=0&size=12",
      ),
    );
    // The note belonged to the AI search; once the filters change it goes away.
    expect(screen.queryByText(/Rooms for “/)).not.toBeInTheDocument();
  });

  it("stays put and says so when the text is not a room search", async () => {
    routes(() =>
      Response.json({
        understood: false,
        filters: {
          neighborhood: null,
          minPriceCents: null,
          maxPriceCents: null,
          minAreaSqft: null,
          amenities: [],
        },
        notes: [
          "That does not look like a room search. Try the neighborhood, rent or amenities.",
        ],
      }),
    );
    renderApp("/");

    const box = await ask("write me a poem");

    expect(
      await within(box).findByText(/does not look like a room search/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Find a room near your stop" }),
    ).toBeInTheDocument();
  });

  it("shows the API's message when AI search is busy or fails, and the filters still work", async () => {
    routes(() =>
      apiError(
        429,
        "AI_BUSY",
        "AI search is busy right now. Try again soon or use the filters.",
      ),
    );
    renderApp("/browse");

    const box = await ask("room in ballard");

    expect(
      await within(box).findByText(/AI search is busy right now/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show rooms" })).toBeEnabled();
  });

  it("asks for a description instead of sending an empty one", async () => {
    const { sent } = routes(() => Response.json(CAP_HILL));
    renderApp("/");

    const box = await ask("   ");

    expect(within(box).getByText(/Describe the room first/)).toBeInTheDocument();
    expect(sent).toEqual([]);
  });
});
