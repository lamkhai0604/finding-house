import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type Toast } from "./toast";

/** How long a toast stays before it closes by itself. */
const TOAST_MS = 5000;
/** Older toasts give way when several actions follow each other quickly. */
const MAX_TOASTS = 3;

/**
 * T-214: shows toasts in a live region at the bottom of the screen. The region is always present,
 * so screen readers announce each new message. It sits above the routes, so a toast survives the
 * navigation that often follows the action (e.g. posting opens the new listing).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message }].slice(-MAX_TOASTS));
      window.setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="toasts"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <span className="toast-mark" aria-hidden="true" />
            <p>{toast.message}</p>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
