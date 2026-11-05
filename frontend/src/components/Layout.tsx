import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { useSession } from "../auth/session";
import { AccountMenu } from "./AccountMenu";
import { BrandMark } from "./BrandMark";
import { ButtonLink } from "./ButtonLink";
import { Footer } from "./Footer";

/** Sticky header, the current page, and the footer (D-027). */
export function Layout() {
  const { status, user, logout } = useSession();
  const location = useLocation();
  // The mobile menu belongs to the page it was opened on, so navigating closes it.
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === location.key;

  return (
    <div className="app-shell">
      <header className="site-header">
        <BrandMark />
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpenOn(menuOpen ? null : location.key)}
        >
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
          <span className="sr-only">Menu</span>
        </button>
        <nav
          id="site-nav"
          aria-label="Main"
          className={menuOpen ? "header-actions open" : "header-actions"}
        >
          {status === "authenticated" && user ? (
            <>
              {user.role === "LANDLORD" && (
                <ButtonLink to="/listings/new" variant="primary">
                  Post a room
                </ButtonLink>
              )}
              <AccountMenu user={user} onLogout={logout} />
            </>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost">
                Log in
              </ButtonLink>
              <ButtonLink to="/register" variant="primary">
                Sign up
              </ButtonLink>
            </>
          )}
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
