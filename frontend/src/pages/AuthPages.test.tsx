import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOKEN_STORAGE_KEY } from "../auth/session";
import { landlordMaya } from "../test/fixtures";
import { apiError, mockApi } from "../test/mockApi";
import { renderApp } from "../test/renderApp";

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("Login page (FR-01)", () => {
  it("logs in, stores the session, and shows the user in the header", async () => {
    mockApi({
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

    const header = await screen.findByRole("banner");
    expect(
      await within(header).findByText("Maya Chen (Landlord)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Welcome back, Maya Chen.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe("tok-1");
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

    expect(await screen.findByText("Maya Chen (Landlord)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("link", { name: "Log in" }),
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
      await screen.findByRole("link", { name: "Log in" }),
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

    fireEvent.change(screen.getByLabelText("Account type"), {
      target: { value: "LANDLORD" },
    });

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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers a landlord with a phone, then logs in", async () => {
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
    });
    renderApp("/register");

    fill("Name", "Maya Chen");
    fill("Email", landlordMaya.email);
    fill("Password", "sample-pass-maya");
    fireEvent.change(screen.getByLabelText("Account type"), {
      target: { value: "LANDLORD" },
    });
    fill("Contact phone (optional)", "(206) 555-0101");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      await screen.findByText("Welcome back, Maya Chen."),
    ).toBeInTheDocument();
    expect(registered).toEqual({
      displayName: "Maya Chen",
      email: landlordMaya.email,
      password: "sample-pass-maya",
      role: "LANDLORD",
      phone: "(206) 555-0101",
    });
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
});
