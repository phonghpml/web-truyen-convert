"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredUser, getAuthToken, isTokenExpired, clearAuth, fetchMe, saveAuth, dispatchAuthChange, AUTH_CHANGE_EVENT, refreshFromCookie, logout, hasRefreshCookie } from "./auth";
import type { AuthUser } from "./types";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateUser = async () => {
      try {
        const stored = getStoredUser();
        const token = getAuthToken();

        if (!token && !hasRefreshCookie()) {
          setUser(stored ?? null);
          return;
        }

        if (!token) {
          const refreshed = await refreshFromCookie();
          if (refreshed && refreshed.token) {
            const refreshedUser: AuthUser = {
              email: refreshed.user?.email,
              name: refreshed.user?.name,
              role: refreshed.user?.role,
            };
            setUser(refreshedUser);
            return;
          }

          setUser(stored ?? null);
          return;
        }

        if (isTokenExpired(token)) {
          if (!hasRefreshCookie()) {
            clearAuth();
            setUser(null);
            dispatchAuthChange();
            return;
          }

          const refreshed = await refreshFromCookie();
          if (refreshed && refreshed.token) {
            const refreshedUser: AuthUser = {
              email: refreshed.user?.email,
              name: refreshed.user?.name,
              role: refreshed.user?.role,
            };
            setUser(refreshedUser);
            return;
          }

          clearAuth();
          setUser(null);
          dispatchAuthChange();
          return;
        }

        // validate token with server
        try {
          const meRes = await fetchMe();
          if (meRes?.success && meRes.data) {
            const refreshedUser: AuthUser = {
              email: meRes.data.email,
              name: meRes.data.name,
              role: meRes.data.role,
            };
            saveAuth(token, refreshedUser);
            setUser(refreshedUser);
            return;
          }
        } catch {
          // validation failed: try cookie refresh
          const refreshed = await refreshFromCookie();
          if (refreshed && refreshed.token) {
            const refreshedUser: AuthUser = {
              email: refreshed.user?.email,
              name: refreshed.user?.name,
              role: refreshed.user?.role,
            };
            setUser(refreshedUser);
            return;
          }
        }

        clearAuth();
        setUser(null);
        dispatchAuthChange();
      } finally {
        setIsLoading(false);
      }
    };

    void updateUser();

    const handleAuthChange = () => setUser(getStoredUser());
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } catch {
      clearAuth();
      dispatchAuthChange();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  return {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    isLoading,
    signOut,
  };
}
