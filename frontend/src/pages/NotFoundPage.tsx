import { ButtonLink } from "../components/ButtonLink";
import { StatusMessage } from "../components/StatusMessage";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <StatusMessage title="Page not found">
      <p>This stop is not on our line. The link may be old or mistyped.</p>
      <div className="empty-actions">
        <ButtonLink to="/browse" variant="primary">
          Browse rooms
        </ButtonLink>
        <ButtonLink to="/">Back to home</ButtonLink>
      </div>
    </StatusMessage>
  );
}
