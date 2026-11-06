import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../api/client";
import type { Role } from "../api/types";
import { useSession } from "../auth/session";
import { Button } from "../components/Button";
import { BackButton } from "../components/BackButton";
import { FormAlert } from "../components/FormAlert";
import { SelectField } from "../components/SelectField";
import { TextField } from "../components/TextField";
import { usePageTitle } from "../hooks/usePageTitle";

const ROLE_OPTIONS = [
  { value: "TENANT", label: "I'm looking for a room (tenant)" },
  { value: "LANDLORD", label: "I have a room to rent (landlord)" },
];

const MIN_PASSWORD_LENGTH = 8;

export function RegisterPage() {
  usePageTitle("Sign up");
  const { register } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "TENANT" as Role,
    phone: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // Quick checks for instant feedback; the server validates everything again (FR-01 AC1).
    const clientErrors: Record<string, string> = {};
    if (!form.displayName.trim()) clientErrors.displayName = "Enter your name";
    if (!form.email.trim()) clientErrors.email = "Enter your email";
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      clientErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    setBusy(true);
    try {
      await register({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        role: form.role,
        phone:
          form.role === "LANDLORD" && form.phone.trim()
            ? form.phone
            : undefined,
      });
      navigate("/", { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.body.code === "EMAIL_TAKEN") {
        setFieldErrors({ email: e.body.message });
      } else if (e instanceof ApiError && e.body.fieldErrors.length > 0) {
        setFieldErrors(e.fieldErrors());
      } else {
        setError(
          e instanceof ApiError ? e.body.message : "Something went wrong.",
        );
      }
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-toolbar narrow">
        <BackButton fallback="/" />
      </div>
      <section className="card narrow">
        <h1>Create an account</h1>
        <form onSubmit={handleSubmit} noValidate>
          <FormAlert message={error} />
          <TextField
            label="Name"
            autoComplete="name"
            value={form.displayName}
            error={fieldErrors.displayName}
            onChange={(e) => update("displayName", e.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            error={fieldErrors.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={form.password}
            error={fieldErrors.password}
            onChange={(e) => update("password", e.target.value)}
          />
          <SelectField
            label="Account type"
            options={ROLE_OPTIONS}
            value={form.role}
            error={fieldErrors.role}
            onChange={(e) => update("role", e.target.value)}
          />
          {form.role === "LANDLORD" && (
            <TextField
              label="Contact phone (optional)"
              type="tel"
              autoComplete="tel"
              hint="Shown to people who view your listings"
              value={form.phone}
              error={fieldErrors.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          )}
          <Button type="submit" busy={busy}>
            Sign up
          </Button>
        </form>
        <p className="muted">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </>
  );
}
