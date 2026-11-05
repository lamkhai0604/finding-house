import { useSession } from "../auth/session";
import { ButtonLink } from "../components/ButtonLink";
import { Carousel } from "../components/Carousel";
import { SAMPLE_SLIDES } from "../content/sampleSlides";

export function HomePage() {
  const { user } = useSession();

  return (
    <>
      <section className="hero">
        <h1>Find a room in Seattle</h1>
        <p className="hero-lead">
          Browse rooms and studios posted by local landlords.
        </p>
        {user ? (
          <>
            <p>Welcome back, {user.displayName}.</p>
            {user.role === "LANDLORD" && (
              <div className="hero-actions">
                <ButtonLink to="/listings/new" variant="primary">
                  Post a room
                </ButtonLink>
                <ButtonLink to="/my/listings">My listings</ButtonLink>
              </div>
            )}
          </>
        ) : (
          <div className="hero-actions">
            <ButtonLink to="/register" variant="primary">
              Create an account
            </ButtonLink>
            <ButtonLink to="/login">Log in</ButtonLink>
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="section-heading">
          <h2>Explore Seattle neighborhoods</h2>
          <p className="muted">
            Sample photos for now — newest listings appear here once browsing
            arrives in Sprint 2.
          </p>
        </div>
        <Carousel label="Seattle neighborhoods" items={SAMPLE_SLIDES} />
      </section>
    </>
  );
}
