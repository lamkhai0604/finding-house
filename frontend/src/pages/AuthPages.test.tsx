import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOKEN_STORAGE_KEY } from "../auth/session";
import { landlordMaya } from "../test/fixtures";
import type { UserProfile } from "../api/types";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

const tenantSam: UserProfile = {
  id: 2,
  email: "sam.tenant@example.com",
  displayName: "Sam Rivera",
  role: "TENANT",
  phone: null,
};

describe("Login page (FR-01)", () => {
  it("logs a landlord in, stores the session, shows the role and opens My listings (T-218)", async () => {
    mockApi({
      "GET /api/v1/me/listings": () => Response.json([]),
      "POST /api/v1/auth/login": () =>
        Response.json({
          accessToken: "tok-1",
          tokenType: "Bearer",
          expiresIn: 86400,
        }),
      "GET /api/v1/me": ({ headers }) =>
        headers.Authorization === "Bearer tok-1"
          ? Response.json(landlordMaya)
          : apiError(401, "UNAUTHORIZED", "Authentication required"),
    });
    renderApp("/login");

    fill("Email", landlordMaya.email);
    fill("Password", "sample-pass-maya");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByRole("heading", { name: "My listings", level: 1 }),
    ).toBeInTheDocument();
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Maya Chen")).toBeInTheDocument();
    expect(within(header).getByText("Landlord")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe("tok-1");
  });

  it("sends a tenant to the home page after logging in (T-218)", async () => {
    mockApi({
      "POST /api/v1/auth/login": () =>
        Response.json({
          accessToken: "tok-t",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      "GET /api/v1/me": () => Response.json(tenantSam),
    });
    renderApp("/login");

    fill("Email", tenantSam.email);
    fill("Password", "sample-pass-sam");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByText("Welcome back, Sam Rivera."),
    ).toBeInTheDocument();
    const header = screen.getByRole("banner");
    expect(within(header).getByText("Tenant")).toBeInTheDocument();
    fireEvent.click(
      within(header).getByRole("button", { name: /Account menu/ }),
    );
    expect(within(header).getByText(/Signed in as/)).toHaveTextContent(
      "Signed in as Tenant",
    );
  });

  it("returns a landlord to the page that asked for a login (T-218)", async () => {
    mockApi({
      "POST /api/v1/auth/login": () =>
        Response.json({
          accessToken: "tok-4",
          tokenType: "Bearer",
          expiresIn: 7200,
        }),
      "GET /api/v1/me": () => Response.json(landlordMaya),
      "GET /api/v1/reference-data": () =>
        Response.json({
          city: "Seattle",
          neighborhoods: ["Ballard"],
          amenities: [],
        }),
    });
    renderApp("/listings/new");

    fill("Email", landlordMaya.email);
    fill("Password", "sample-pass-maya");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByRole("heading", { name: "Post a room", level: 1 }),
    ).toBeInTheDocument();
  });

  it("shows the server's message for wrong credentials and stays on the page", async () => {
    mockApi({
      "POST /api/v1/auth/login": () =>
        apiError(401, "INVALID_CREDENTIALS", "Invalid email or password"),
    });
    renderApp("/login");

    fill("Email", "someone@example.com");
    fill("Password", "wrong-password");
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
  });

  it("restores the session from sessionStorage on reload, and logs out", async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "tok-2");
    mockApi({ "GET /api/v1/me": () => Response.json(landlordMaya) });
    renderApp("/");

    expect(await screen.findByText("Maya Chen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Account menu/ }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await within(screen.getByRole("banner")).findByRole("link", {
        name: "Log in",
      }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("drops an expired stored token", async () => {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, "expired");
    mockApi({
      "GET /api/v1/me": () =>
        apiError(401, "UNAUTHORIZED", "Authentication required"),
    });
    renderApp("/");

    expect(
      await within(screen.getByRole("banner")).findByRole("link", {
        name: "Log in",
      }),
    ).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe("Register page (FR-01)", () => {
  it("asks for a phone number only when registering as a landlord", () => {
    mockApi({});
    renderApp("/register");

    expect(
      screen.queryByLabelText("Contact phone (optional)"),
    ).not.toBeInTheDocument();

    expect(screen.getByRole("radio", { name: /Find a room/ })).toBeChecked();
    // T-219: each card names the account type the header badge will show.
    expect(
      screen.getByRole("radio", { name: /Find a room.*Tenant account/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Rent out a room.*Landlord account/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Rent out a room/ }));

    expect(
      screen.getByLabelText("Contact phone (optional)"),
    ).toBeInTheDocument();
  });

  it("checks required fields and password length before calling the server", () => {
    const fetchMock = mockApi({});
    renderApp("/register");

    fill("Password", "short");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(screen.getByText("Enter your name")).toBeInTheDocument();
    expect(screen.getByText("Enter your email")).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters")).toBeInTheDocument();
    // The footer's API status check may run; no account request may be sent.
    const posts = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === "POST",
    );
    expect(posts).toHaveLength(0);
  });

  it("registers a landlord with a phone, logs in and opens My listings", async () => {
    let registered: unknown;
    mockApi({
      "POST /api/v1/auth/register": ({ body }) => {
        registered = body;
        return Response.json(landlordMaya, { status: 201 });
      },
      "POST /api/v1/auth/login": () =>
        Response.json({
          accessToken: "tok-3",
          tokenType: "Bearer",
          expiresIn: 86400,
        }),
      "GET /api/v1/me": () => Response.json(landlordMaya),
      "GET /api/v1/me/listings": () => Response.json([]),
    });
    renderApp("/register");

    fill("Name", "Maya Chen");
    fill("Email", landlordMaya.email);
    fill("Password", "sample-pass-maya");
    fireEvent.click(screen.getByRole("radio", { name: /Rent out a room/ }));
    fill("Contact phone (optional)", "(206) 555-0101");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      await screen.findByRole("heading", { name: "My listings", level: 1 }),
    ).toBeInTheDocument();
    // T-220: a confirmation that the account exists and which kind it is.
    expect(
      screen.getByText(
        "Welcome to Finding House, Maya Chen! Your landlord account is ready.",
      ),
    ).toBeInTheDocument();
    expect(registered).toEqual({
      displayName: "Maya Chen",
      email: landlordMaya.email,
      password: "sample-pass-maya",
      role: "LANDLORD",
      phone: "(206) 555-0101",
    });
  });

  it("confirms a tenant's new account and greets a first visit (T-220)", async () => {
    mockApi({
      "POST /api/v1/auth/register": () =>
        Response.json(tenantSam, { status: 201 }),
      "POST /api/v1/auth/login": () =>
        Response.json({ accessToken: "tok-5", tokenType: "Bearer", expiresIn: 7200 }),
      "GET /api/v1/me": () => Response.json(tenantSam),
      "GET /api/v1/me/favorites/ids": () => Response.json([]),
    });
    renderApp("/register");

    fill("Name", tenantSam.displayName);
    fill("Email", tenantSam.email);
    fill("Password", "sample-pass-sam");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      await screen.findByText(
        "Welcome to Finding House, Sam Rivera! Your tenant account is ready.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByText("Welcome, Sam Rivera.")).toBeInTheDocument();
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
  });

  it("shows 'email already exists' next to the email field", async () => {
    mockApi({
      "POST /api/v1/auth/register": () =>
        apiError(
          409,
          "EMAIL_TAKEN",
          "An account with this email already exists",
        ),
    });
    renderApp("/register");

    fill("Name", "Ana");
    fill("Email", "taken@example.com");
    fill("Password", "long-enough-password");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      await screen.findByText("An account with this email already exists"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("explains when sign-ups from this network are paused (T-113)", async () => {
    mockApi({
      "POST /api/v1/auth/register": () =>
        apiError(
          429,
          "TOO_MANY_ATTEMPTS",
          "Too many sign-up attempts from your network. Try again in 42 minutes.",
        ),
    });
    renderApp("/register");

    fill("Name", "Ana");
    fill("Email", "ana@example.com");
    fill("Password", "long-enough-password");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many sign-up attempts from your network. Try again in 42 minutes.",
    );
  });
});

describe("Back button on the account pages (T-207)", () => {
  it.each(["/login", "/register"])(
    "%s has a Back button to the home page",
    (path) => {
      mockApi({});
      renderApp(path);

      fireEvent.click(screen.getByRole("button", { name: /Back/ }));

      expect(
        screen.getByRole("heading", { name: "Find a room near your stop" }),
      ).toBeInTheDocument();
    },
  );
});
