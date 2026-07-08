"use client";

import { useEffect, useState, useCallback } from "react";
import { getStoredUser, clearAuth } from "./auth";
import type { AuthUser } from "./types";

const AUTH_CHANGE_EVENT = "web_truyen_auth_change";

export function dispatchAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    const handleAuthChange = () => setUser(getStoredUser());
    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
  }, []);

  const signOut = useCallback(() => {
    clearAuth();
    setUser(null);
    dispatchAuthChange();
  }, []);

  return {
    user,
    isAuthenticated: Boolean(user),
    signOut,
  };
}
