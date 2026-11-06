import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getFavoriteIds, removeFavorite, saveFavorite } from "../api/favorites";
import { useSession } from "../auth/session";
import { FavoritesContext, type Favorites } from "./favorites";

interface Saved {
  userId: number;
  ids: ReadonlySet<number>;
}

/** T-403: which rooms the logged-in tenant has saved, shared by every page. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const tenantId = user?.role === "TENANT" ? user.id : null;
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => {
    if (tenantId === null) return;
    let active = true;
    getFavoriteIds()
      .then((ids) => {
        if (active) setSaved({ userId: tenantId, ids: new Set(ids) });
      })
      // Without the list every heart starts empty; saving still works.
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tenantId]);

  // Ignore a list that belongs to someone who has since logged out.
  const ids = useMemo(
    () => (saved && saved.userId === tenantId ? saved.ids : new Set<number>()),
    [saved, tenantId],
  );

  const update = useCallback(
    (listingId: number, on: boolean) => {
      if (tenantId === null) return;
      setSaved((current) => {
        const next = new Set(
          current && current.userId === tenantId ? current.ids : [],
        );
        if (on) next.add(listingId);
        else next.delete(listingId);
        return { userId: tenantId, ids: next };
      });
    },
    [tenantId],
  );

  const toggle = useCallback(
    async (listingId: number) => {
      const wasSaved = ids.has(listingId);
      update(listingId, !wasSaved);
      try {
        if (wasSaved) await removeFavorite(listingId);
        else await saveFavorite(listingId);
      } catch (error) {
        update(listingId, wasSaved);
        throw error;
      }
    },
    [ids, update],
  );

  const value = useMemo<Favorites>(
    () => ({
      enabled: tenantId !== null,
      ready: saved !== null && saved.userId === tenantId,
      isSaved: (listingId) => ids.has(listingId),
      toggle,
    }),
    [tenantId, saved, ids, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}
