import { Link } from "react-router";
import { BrandMark } from "./BrandMark";
import { HealthStatus } from "./HealthStatus";

const REPOSITORY_URL = "https://github.com/lamkhai0604/finding-house";

/** D-027: shown on every page by Layout. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <BrandMark />
          <p>
            Rooms and studios for rent in Seattle, posted by local landlords.
          </p>
        </div>
        <nav aria-label="Footer" className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/browse">Browse rooms</Link>
          <Link to="/listings/new">Post a room</Link>
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            Source on GitHub
          </a>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Finding House · Portfolio project</span>
        <HealthStatus />
      </div>
    </footer>
  );
}
