import { ButtonLink } from "../components/ButtonLink";
import { StatusMessage } from "../components/StatusMessage";

export function NotFoundPage() {
  return (
    <StatusMessage title="Page not found">
      <ButtonLink to="/">Back to home</ButtonLink>
    </StatusMessage>
  );
}
