import { createContext, useContext } from "react";
import type { RegisterRequest, UserProfile } from "../api/types";

export type SessionStatus = "loading" | "anonymous" | "authenticated";

export interface Session {
  status: SessionStatus;
  user: UserProfile | null;
  /** Resolves with the signed-in user, so callers can route by role. */
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (request: RegisterRequest) => Promise<UserProfile>;
  logout: () => void;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used inside <SessionProvider>");
  }
  return session;
}

/** D-009: the token lives in memory and in sessionStorage (cleared when the tab closes). */
export const TOKEN_STORAGE_KEY = "findinghouse.accessToken";

export function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode); the in-memory token still works.
  }
}
