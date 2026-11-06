import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LoadingContext } from "./loading";

/** After this long, the free backend is probably waking up from sleep (D-029). */
export const SLOW_AFTER_MS = 4000;
/** How long the finished line stays before it fades away. */
const DONE_MS = 300;

type BarState = "idle" | "loading" | "done";

/**
 * T-217: one place that knows whether anything on screen is waiting for the server. Page skeletons
 * and busy buttons report in through `useLoadingSignal`. While anything waits, a thin pink line runs
 * along the top of the page; after SLOW_AFTER_MS a notice explains that the server is waking up.
 * Nothing is hidden or delayed: pages keep their own skeletons.
 */
export function LoadingProvider({ children }: { children: ReactNode }) {
  const [bar, setBar] = useState<BarState>("idle");
  const [slow, setSlow] = useState(false);
  const waiting = useRef(0);
  const slowTimer = useRef<number | undefined>(undefined);
  const doneTimer = useRef<number | undefined>(undefined);

  // State changes happen when the count crosses zero, not in an effect, so nothing re-renders twice.
  const begin = useCallback(() => {
    waiting.current += 1;
    if (waiting.current === 1) {
      window.clearTimeout(doneTimer.current);
      setBar("loading");
      slowTimer.current = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    }
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      waiting.current -= 1;
      if (waiting.current === 0) {
        window.clearTimeout(slowTimer.current);
        setSlow(false);
        setBar("done");
        doneTimer.current = window.setTimeout(() => setBar("idle"), DONE_MS);
      }
    };
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(slowTimer.current);
      window.clearTimeout(doneTimer.current);
    },
    [],
  );

  const api = useMemo(() => ({ begin }), [begin]);

  return (
    <LoadingContext.Provider value={api}>
      <div className="nav-progress" data-state={bar} aria-hidden="true">
        <span />
      </div>
      {children}
      {slow && (
        <p className="slow-notice" role="status">
          Waking up the server. Free hosting sleeps when nobody is using it, so
          this can take up to a minute.
        </p>
      )}
    </LoadingContext.Provider>
  );
}
