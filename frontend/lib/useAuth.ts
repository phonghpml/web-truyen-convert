"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredUser, getAuthToken, isTokenExpired, clearAuth, fetchMe, saveAuth, dispatchAuthChange, AUTH_CHANGE_EVENT } from "./auth";
import type { AuthUser } from "./types";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const updateUser = async () => {
      try {
        const stored = getStoredUser();
        const token = getAuthToken();

        if (!token) {
          // no token: use stored if any but clear if inconsistent
          setUser(stored);
          return;
        }

        // token exists: if expired, clear and stop
        if (isTokenExpired(token)) {
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
        } catch (err) {
          // validation failed: clear auth
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

  const signOut = useCallback(() => {
    clearAuth();
    setUser(null);
    setIsLoading(false);
    dispatchAuthChange();
  }, []);

  return {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    isLoading,
    signOut,
  };
}
