import { useCallback, useEffect, useState } from "react";
import { signup as apiSignup, login as apiLogin, logout as apiLogout, getMe } from "../api/client";

/**
 * useAuth — the logged-in user (or null), plus the three actions that change it.
 *
 * Fetches /api/auth/me on mount to pick up an existing session cookie. A 401
 * there just means "not logged in" — src/api/client.js's api() throws on any
 * non-2xx, so that rejection is caught here and folded into `user: null`
 * rather than surfaced as an error state; there is nothing to show the user
 * for "you haven't logged in yet".
 *
 * login/signup reject with an Error on bad credentials, a duplicate email,
 * etc. — same convention as every other src/api/client.js call. Callers
 * (AuthBar) catch that and show err.message inline.
 */
export default function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await apiLogin(email, password);
    setUser(u);
    return u;
  }, []);

  const signup = useCallback(async (email, password) => {
    const u = await apiSignup(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return { user, login, signup, logout };
}
