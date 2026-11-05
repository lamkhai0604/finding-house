import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import { useSession } from "../auth/session";
import { Button } from "../components/Button";
import { FormAlert } from "../components/FormAlert";
import { TextField } from "../components/TextField";

export function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const returnTo = (location.state as { from?: string } | null)?.from ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.body.message : "Something went wrong.",
      );
      setBusy(false);
    }
  }

  return (
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
  );
}
