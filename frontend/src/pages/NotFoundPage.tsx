import { ButtonLink } from "../components/ButtonLink";
import { StatusMessage } from "../components/StatusMessage";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <StatusMessage title="Page not found">
      <ButtonLink to="/">Back to home</ButtonLink>
    </StatusMessage>
  );
}
