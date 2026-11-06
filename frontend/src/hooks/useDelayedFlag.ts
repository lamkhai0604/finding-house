import { useEffect, useState } from "react";

/**
 * True only once `active` has stayed true for `delayMs` (D-027). Loading indicators use it so that
 * fast requests do not make the page flicker.
 */
export function useDelayedFlag(active: boolean, delayMs = 200): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => {
      window.clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, delayMs]);

  return active && elapsed;
}
