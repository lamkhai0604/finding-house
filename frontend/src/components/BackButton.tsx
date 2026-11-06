import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";

interface BackButtonProps {
  /** Where to go when there is no earlier page in this app, e.g. the user opened a shared link. */
  fallback: string;
  label?: string;
  /** Ask before leaving, e.g. when a form has unsaved changes. */
  confirmLeave?: boolean;
}

/** D-027: goes back to the previous page in the app, or to `fallback`. */
export function BackButton({
  fallback,
  label = "Back",
  confirmLeave = false,
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [asking, setAsking] = useState(false);

  function leave() {
    // React Router gives the first page of a visit the key "default": nothing to go back to.
    if (location.key === "default") {
      navigate(fallback);
    } else {
      navigate(-1);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        className="back-button"
        onClick={() => (confirmLeave ? setAsking(true) : leave())}
      >
        <span aria-hidden="true">←</span> {label}
      </Button>
      <ConfirmDialog
        open={asking}
        title="Discard your changes?"
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={leave}
        onCancel={() => setAsking(false)}
      >
        <p>You have changes that are not saved yet.</p>
      </ConfirmDialog>
    </>
  );
}
