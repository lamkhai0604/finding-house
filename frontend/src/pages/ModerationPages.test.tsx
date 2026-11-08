import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReportGroup, UserProfile } from "../api/types";
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

const adminSam: UserProfile = {
  id: 9,
  email: "sam.admin@example.com",
  displayName: "Sam Admin",
  role: "ADMIN",
  phone: null,
};

function loggedInAs(user: UserProfile) {
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok");
  return {
    "GET /api/v1/me": () => Response.json(user),
    "GET /api/v1/me/favorites/ids": () => Response.json([]),
  };
}

const group: ReportGroup = {
  listing: {
    id: 7,
    title: "Sunny studio near UW",
    neighborhood: "University District",
    status: "ACTIVE",
    landlordName: "Maya Chen",
    removedReason: null,
  },
  reportCount: 3,
  reasons: { SCAM: 2, WRONG_INFO: 1 },
  reports: [
    {
      reason: "SCAM",
      note: "Asked for a wire deposit",
      createdAt: "2026-11-07T10:00:00Z",
    },
    { reason: "WRONG_INFO", note: null, createdAt: "2026-11-07T09:00:00Z" },
    { reason: "SCAM", note: null, createdAt: "2026-11-07T08:00:00Z" },
  ],
  latestReportAt: "2026-11-07T10:00:00Z",
};

describe("Reporting a listing (FR-08 AC1, T-604)", () => {
  it("lets a tenant send a report with a reason and a note", async () => {
    let sent: unknown;
    mockApi({
      ...loggedInAs(tenantAlex),
      "GET /api/v1/listings/7": () => Response.json(listingDetail()),
      "POST /api/v1/listings/7/reports": ({ body }) => {
        sent = body;
        return Response.json({ id: 1, status: "OPEN" }, { status: 201 });
      },
    });
    renderApp("/listings/7");

    fireEvent.click(
      await screen.findByRole("button", { name: "Report this listing" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Report this listing" });
    const send = within(dialog).getByRole("button", { name: "Send report" });
    expect(send).toBeDisabled();
    fireEvent.click(
      within(dialog).getByRole("radio", { name: "Scam or fraud" }),
    );
    fireEvent.change(within(dialog).getByLabelText("Details (optional)"), {
      target: { value: "  Asked for a deposit by wire  " },
    });
    fireEvent.click(send);

    expect(
      await screen.findByText("Thanks. A moderator will review this listing."),
    ).toBeInTheDocument();
    expect(sent).toEqual({
      reason: "SCAM",
      note: "Asked for a deposit by wire",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says so when the user already reported the listing", async () => {
    mockApi({
      ...loggedInAs(tenantAlex),
      "GET /api/v1/listings/7": () => Response.json(listingDetail()),
      "POST /api/v1/listings/7/reports": () =>
        apiError(409, "CONFLICT", "You already reported this listing"),
    });
    renderApp("/listings/7");

    fireEvent.click(
      await screen.findByRole("button", { name: "Report this listing" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: "Other" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Send report" }),
    );

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "You already reported this listing.",
    );
  });

  it("asks guests to log in and offers nothing to the owner", async () => {
    mockApi({ "GET /api/v1/listings/7": () => Response.json(listingDetail()) });
    const { unmount } = renderApp("/listings/7");
    expect(
      await screen.findByRole("link", {
        name: "Log in to report this listing",
      }),
    ).toHaveAttribute("href", "/login");
    unmount();

    mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/listings/7": () => Response.json(listingDetail()),
    });
    renderApp("/listings/7");
    expect(
      await screen.findByRole("link", { name: "Edit this listing" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Report this listing" }),
    ).not.toBeInTheDocument();
  });
});

describe("A removed listing (FR-08 AC3, D-037)", () => {
  it("shows the owner the moderator's reason and no way to change it", async () => {
    const removed = listingDetail({
      status: "REMOVED",
      removedReason: "Asked for a wire deposit",
    }).listing;
    const active = listingDetail({ id: 8, title: "Ballard loft" }).listing;
    mockApi({
      ...loggedInAs(landlordMaya),
      "GET /api/v1/me/listings": () => Response.json([removed, active]),
    });
    renderApp("/my/listings");

    const removedCard = (
      await screen.findByRole("heading", { name: "Sunny studio near UW" })
    ).closest("article")!;
    expect(removedCard).toHaveTextContent(
      "Removed by a moderator. Asked for a wire deposit",
    );
    expect(within(removedCard).queryByRole("button")).not.toBeInTheDocument();
    expect(
      within(removedCard).queryByRole("link", { name: "Edit" }),
    ).not.toBeInTheDocument();
    const counts = screen
      .getByText("Removed by a moderator", { selector: "dt" })
      .closest("div")!;
    expect(counts).toHaveTextContent("1");
    const activeCard = screen
      .getByRole("heading", { name: "Ballard loft" })
      .closest("article")!;
    expect(
      within(activeCard).getByRole("button", { name: "Hide" }),
    ).toBeInTheDocument();
  });
});

describe("Moderation page (FR-08 AC2 to AC4, T-604)", () => {
  it("removes a reported listing with a reason and reloads the queue", async () => {
    let queue: ReportGroup[] = [group];
    let removeBody: unknown;
    mockApi({
      ...loggedInAs(adminSam),
      "GET /api/v1/admin/reports": () => Response.json(queue),
      "GET /api/v1/admin/listings/removed": () => Response.json([]),
      "GET /api/v1/admin/actions": () => Response.json([]),
      "POST /api/v1/admin/listings/7/remove": ({ body }) => {
        removeBody = body;
        queue = [];
        return Response.json(listingDetail({ status: "REMOVED" }).listing);
      },
    });
    renderApp("/admin");

    const card = (
      await screen.findByRole("heading", { name: "Sunny studio near UW" })
    ).closest("article")!;
    expect(card).toHaveTextContent("3 reports");
    expect(within(card).getByText("Scam or fraud ×2")).toBeInTheDocument();
    expect(within(card).getByText("Wrong information")).toBeInTheDocument();
    expect(card).toHaveTextContent("Asked for a wire deposit");

    fireEvent.click(
      within(card).getByRole("button", { name: "Remove listing" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Remove this listing?" });
    const reason = within(dialog).getByLabelText(
      "Reason shown to the landlord",
    );
    expect(reason).toHaveValue("Scam or fraud");
    fireEvent.change(reason, { target: { value: "" } });
    expect(
      within(dialog).getByRole("button", { name: "Remove listing" }),
    ).toBeDisabled();
    fireEvent.change(reason, { target: { value: "Asked for a wire deposit" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Remove listing" }),
    );

    expect(
      await screen.findByText('"Sunny studio near UW" was removed.'),
    ).toBeInTheDocument();
    expect(removeBody).toEqual({ reason: "Asked for a wire deposit" });
    expect(await screen.findByText("No open reports")).toBeInTheDocument();
  });

  it("dismisses reports and restores a removed listing", async () => {
    const calls: string[] = [];
    mockApi({
      ...loggedInAs(adminSam),
      "GET /api/v1/admin/reports": () => Response.json([group]),
      "GET /api/v1/admin/listings/removed": () =>
        Response.json([
          {
            ...group.listing,
            id: 8,
            title: "Ballard loft",
            status: "REMOVED",
            removedReason: "Duplicate",
          },
        ]),
      "GET /api/v1/admin/actions": () =>
        Response.json([
          {
            id: 1,
            listingId: 8,
            listingTitle: "Ballard loft",
            adminName: "Sam Admin",
            action: "REMOVE",
            reason: "Duplicate",
            createdAt: "2026-11-07T10:00:00Z",
          },
        ]),
      "POST /api/v1/admin/listings/7/dismiss": () => {
        calls.push("dismiss 7");
        return new Response(null, { status: 204 });
      },
      "POST /api/v1/admin/listings/8/restore": () => {
        calls.push("restore 8");
        return Response.json(
          listingDetail({ id: 8, status: "HIDDEN" }).listing,
        );
      },
    });
    renderApp("/admin");

    const actions = await screen.findByRole("table");
    expect(actions).toHaveTextContent("Removed");
    expect(actions).toHaveTextContent("Sam Admin");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Dismiss reports",
      }),
    );
    await screen.findByText(
      'Reports on "Sunny studio near UW" were dismissed.',
    );

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Restore",
      }),
    );
    await screen.findByText('"Ballard loft" was restored as hidden.');
    expect(calls).toEqual(["dismiss 7", "restore 8"]);
  });

  it("is for administrators only", async () => {
    mockApi({ ...loggedInAs(tenantAlex) });
    renderApp("/admin");

    expect(
      await screen.findByRole("heading", { name: "Administrators only" }),
    ).toBeInTheDocument();
  });

  it("shows an administrator the Admin badge and the Moderation link", async () => {
    mockApi({
      ...loggedInAs(adminSam),
      "GET /api/v1/neighborhoods": () => Response.json([]),
      "GET /api/v1/listings": () =>
        Response.json({
          items: [],
          page: 0,
          size: 12,
          totalItems: 0,
          totalPages: 0,
        }),
      "GET /api/v1/search/interpret": () => Response.json({ available: false }),
    });
    renderApp("/");

    const header = screen.getByRole("banner");
    expect(await within(header).findByText("Admin")).toBeInTheDocument();
    fireEvent.click(
      within(header).getByRole("button", { name: /Account menu/ }),
    );
    expect(
      within(header).getByRole("link", { name: "Moderation" }),
    ).toHaveAttribute("href", "/admin");
    await waitFor(() =>
      expect(within(header).getByText(/Signed in as/)).toHaveTextContent(
        "Admin",
      ),
    );
  });
});
