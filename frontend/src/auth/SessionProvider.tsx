import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchCurrentUser, login as loginRequest, registerAccount } from "../api/auth";
import { setAccessToken } from "../api/client";
import type { RegisterRequest, UserProfile } from "../api/types";
import {
  readStoredToken,
  SessionContext,
  storeToken,
  type Session,
  type SessionStatus,
} from "./session";

/** Owns the logged-in user and access token for the whole app. */
export function SessionProvider({ children }: { children: ReactNode }) {
  // With a stored token we must ask the server who it belongs to; without one we already know.
  const [status, setStatus] = useState<SessionStatus>(() =>
    readStoredToken() ? "loading" : "anonymous",
  );
  const [user, setUser] = useState<UserProfile | null>(null);

  const clear = useCallback(() => {
    setAccessToken(null);
    storeToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const startSession = useCallback(async (token: string) => {
    setAccessToken(token);
    const profile = await fetchCurrentUser();
    storeToken(token);
    setUser(profile);
    setStatus("authenticated");
  }, []);

  // Restore a session from an earlier page load in the same tab.
  useEffect(() => {
    const token = readStoredToken();
    if (token) {
      startSession(token).catch(clear);
    }
  }, [startSession, clear]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginRequest(email, password);
      await startSession(response.accessToken);
    },
    [startSession],
  );

  const register = useCallback(
    async (request: RegisterRequest) => {
      await registerAccount(request);
      await login(request.email, request.password);
    },
    [login],
  );

  const session = useMemo<Session>(
    () => ({ status, user, login, register, logout: clear }),
    [status, user, login, register, clear],
  );

  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}
