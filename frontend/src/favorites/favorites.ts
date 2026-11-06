import { createContext, useContext } from "react";

export interface Favorites {
  /** True for a logged-in tenant: only tenants can save rooms (FR-06). */
  enabled: boolean;
  /** True once the saved list has loaded for the current tenant. */
  ready: boolean;
  isSaved: (listingId: number) => boolean;
  /** Saves or unsaves; the change shows at once and is undone if the server refuses it. */
  toggle: (listingId: number) => Promise<void>;
}

export const FavoritesContext = createContext<Favorites>({
  enabled: false,
  ready: false,
  isSaved: () => false,
  toggle: async () => {},
});

export function useFavorites(): Favorites {
  return useContext(FavoritesContext);
}
