import { Link } from "react-router";
import { StatusMessage } from "../components/StatusMessage";

export function NotFoundPage() {
  return (
    <StatusMessage title="Page not found">
      <Link to="/">Back to home</Link>
    </StatusMessage>
  );
}
