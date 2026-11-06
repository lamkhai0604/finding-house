import { createContext, useContext, useEffect } from "react";

export interface LoadingApi {
  /** Marks one piece of the page as waiting for the server; call the result when it is done. */
  begin: () => () => void;
}

export const LoadingContext = createContext<LoadingApi>({
  begin: () => () => {},
});

/**
 * T-217: while `active` is true, this component counts as waiting for the server, which shows the
 * progress line at the top of the page and, after a few seconds, the "waking up" notice.
 */
export function useLoadingSignal(active: boolean): void {
  const { begin } = useContext(LoadingContext);
  useEffect(() => {
    if (!active) return;
    return begin();
  }, [active, begin]);
}
