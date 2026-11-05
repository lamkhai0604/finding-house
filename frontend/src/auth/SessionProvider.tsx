import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchCurrentUser,
  login as loginRequest,
  registerAccount,
} from "../api/auth";
import { setAccessToken, setUnauthorizedHandler } from "../api/client";
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

  // An expired token ends the session (T-110).
  useEffect(() => {
    setUnauthorizedHandler(clear);
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  // Restore a session from an earlier page load in the same tab. State is only set in the
  // promise callbacks, never synchronously inside the effect.
  useEffect(() => {
    const token = readStoredToken();
    if (!token) {
      return;
    }
    let active = true;
    setAccessToken(token);
    fetchCurrentUser()
      .then((profile) => {
        if (active) {
          setUser(profile);
          setStatus("authenticated");
        }
      })
      .catch(() => {
        if (active) {
          clear();
        }
      });
    return () => {
      active = false;
    };
  }, [clear]);

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
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
