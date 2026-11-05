import { Link } from "react-router";
import { useSession } from "../auth/session";
import { HealthStatus } from "../components/HealthStatus";

export function HomePage() {
  const { user } = useSession();

  return (
    <section>
      <h1>Find a room in Seattle</h1>
      <p>Browse rooms and studios posted by local landlords.</p>
      {user ? (
        <p>Welcome back, {user.displayName}.</p>
      ) : (
        <p>
          <Link to="/register">Create an account</Link> or{" "}
          <Link to="/login">log in</Link> to get started.
        </p>
      )}
      <p className="muted">Browsing and search arrive in Sprint 2.</p>
      <HealthStatus />
    </section>
  );
}
