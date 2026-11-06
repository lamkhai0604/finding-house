import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { TOKEN_STORAGE_KEY } from "../auth/session";
import { landlordMaya, listingDetail } from "../test/fixtures";
import { mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";
import { BackButton } from "./BackButton";

function loggedInAsMaya() {
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
  return { "GET /api/v1/me": () => Response.json(landlordMaya) };
}

describe("BackButton (D-027)", () => {
  function renderAt(entries: string[], confirmLeave = false) {
    render(
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <Routes>
          <Route path="/" element={<h1>Home</h1>} />
          <Route path="/previous" element={<h1>Previous page</h1>} />
          <Route
            path="/current"
            element={<BackButton fallback="/" confirmLeave={confirmLeave} />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("goes to the fallback when the page was opened directly", () => {
    renderAt(["/current"]);

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });

  it("asks before leaving when there are unsaved changes", () => {
    renderAt(["/current"], true);

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(
      screen.queryByRole("heading", { name: "Home" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });
});

describe("Header and footer (D-027)", () => {
  it("shows an account menu that opens, closes with Escape, and logs out", async () => {
    mockApi(loggedInAsMaya());
    renderApp("/");
    const header = screen.getByRole("banner");

    const accountButton = await within(header).findByRole("button", {
      name: /Account menu/,
    });
    expect(accountButton).toHaveTextContent("MC");
    expect(accountButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(accountButton);
    expect(accountButton).toHaveAttribute("aria-expanded", "true");
    expect(
      within(header).getByRole("link", { name: "My listings" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(accountButton).toHaveAttribute("aria-expanded", "false");
    expect(accountButton).toHaveFocus();
  });

  it("has a menu button for small screens", () => {
    mockApi({});
    renderApp("/");
    const toggle = screen.getByRole("button", { name: "Menu" });

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the footer on every page", async () => {
    mockApi({
      "GET /api/v1/listings/7": () => Response.json(listingDetail()),
    });
    renderApp("/listings/7");

    const footer = screen.getByRole("contentinfo");
    expect(
      within(footer).getByRole("link", { name: "Source on GitHub" }),
    ).toHaveAttribute("href", "https://github.com/lamkhai0604/finding-house");
    expect(within(footer).getByText(/Portfolio project/)).toBeInTheDocument();
  });

  it("lets a visitor go back to the rooms from a listing opened directly", async () => {
    mockApi({
      "GET /api/v1/listings/7": () => Response.json(listingDetail()),
    });
    renderApp("/listings/7");

    fireEvent.click(
      await screen.findByRole("button", { name: /Back to rooms/ }),
    );

    expect(
      await screen.findByRole("heading", { name: "Browse rooms" }),
    ).toBeInTheDocument();
  });
});

describe("Listing form leaves safely (D-027)", () => {
  it("warns about unsaved changes only after something was edited", async () => {
    mockApi({
      ...loggedInAsMaya(),
      "GET /api/v1/reference-data": () =>
        Response.json({
          city: "Seattle",
          neighborhoods: ["Ballard"],
          amenities: ["WIFI"],
        }),
      "GET /api/v1/listings/7": () => Response.json(listingDetail()),
      "GET /api/v1/me/listings": () => Response.json([]),
    });
    renderApp("/listings/new");

    await screen.findByRole("heading", { name: "Post a room" });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Half-written listing" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));

    expect(
      screen.getByRole("dialog", { name: "Discard your changes?" }),
    ).toBeInTheDocument();
  });
});
