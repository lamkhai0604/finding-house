import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { homePathFor, roleLabel } from "../auth/homePath";
import { useToast } from "../toast/toast";
import { useSession } from "../auth/session";
import { Button } from "../components/Button";
import { BackButton } from "../components/BackButton";
import { FormAlert } from "../components/FormAlert";
import { TextField } from "../components/TextField";
import { usePageTitle } from "../hooks/usePageTitle";

export function LoginPage() {
  usePageTitle("Log in");
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A page that sent the visitor here wins; otherwise each role starts on its own home.
  const toast = useToast();
  const returnTo = (location.state as { from?: string } | null)?.from;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const profile = await login(email, password);
      // UX-01: confirm the sign-in and which account it is, whichever page comes next.
      toast.show(`Signed in as ${profile.displayName} (${roleLabel(profile)}).`);
      navigate(returnTo ?? homePathFor(profile), { replace: true });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.body.message : "Something went wrong.",
      );
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-toolbar narrow">
        <BackButton fallback="/" />
      </div>
      <section className="card narrow">
        <h1>Log in</h1>
        <form onSubmit={handleSubmit} noValidate>
          <FormAlert message={error} />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" busy={busy}>
            Log in
          </Button>
        </form>
        <p className="muted">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </>
  );
}
