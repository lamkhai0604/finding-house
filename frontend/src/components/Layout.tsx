import { Link, NavLink, Outlet } from "react-router";
import { useSession } from "../auth/session";

/** Header with navigation, then the current page. */
export function Layout() {
  const { status, user, logout } = useSession();

  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          Finding House
        </Link>
        <nav aria-label="Account">
          {status === "authenticated" && user ? (
            <>
              <span className="signed-in-as">
                {user.displayName} ({user.role === "LANDLORD" ? "Landlord" : "Tenant"})
              </span>
              <button type="button" className="link-button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Sign up</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
