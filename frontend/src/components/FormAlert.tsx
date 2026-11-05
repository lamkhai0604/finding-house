/** A form-level message, e.g. "Invalid email or password". Renders nothing without a message. */
export function FormAlert({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="form-alert">
      {message}
    </p>
  );
}
