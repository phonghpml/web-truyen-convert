import { ENDPOINTS } from "./constants";
import type { AuthUser, ApiResponse, LibraryStatusResponse, ReadingHistory } from "./types";

export const AUTH_CHANGE_EVENT = "web_truyen_auth_change";
const AUTH_TOKEN_KEY = "web_truyen_auth_token";
const AUTH_USER_KEY = "web_truyen_auth_user";
const REFRESH_SESSION_HINT_KEY = "web_truyen_refresh_session_hint";
let refreshPromise: Promise<{ token: string; user: AuthUser } | null> | null = null;
let fetchMePromise: Promise<ApiResponse<AuthUser>> | null = null;
let fetchMeCache: { token: string; expiresAt: number; response: ApiResponse<AuthUser> } | null = null;
const FETCH_ME_CACHE_MS = 15_000;

function safeParse(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function parseJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      const raw = await res.text().catch(() => null);
      return { success: false, error: "invalid_json", raw };
    }
  }

  const raw = await res.text().catch(() => null);
  return { success: false, error: "non_json_response", raw, status: res.status, ok: res.ok };
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function hasRefreshSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(REFRESH_SESSION_HINT_KEY) === "1";
}

function base64UrlToBase64(input: string) {
  return input.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((2 - input.length * 3) & 3);
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return false;
  if (typeof window === "undefined") return false;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;
    const raw = parts[1];

    // Try interpret as epoch seconds directly
    const direct = parseInt(raw, 10);
    if (!Number.isNaN(direct)) {
      return direct < Math.floor(Date.now() / 1000);
    }

    // Try decode base64url -> string
    let decoded = "";
    try {
      const b64 = base64UrlToBase64(raw);
      decoded = atob(b64);
    } catch {
      decoded = raw;
    }

    // If decoded is JSON with exp field
    try {
      const obj = JSON.parse(decoded);
      if (obj && typeof obj.exp === "number") {
        return obj.exp < Math.floor(Date.now() / 1000);
      }
    } catch {
      // not JSON
    }

    // fallback: parse decoded as number
    const n = parseInt(decoded, 10);
    if (!Number.isNaN(n)) return n < Math.floor(Date.now() / 1000);
  } catch {
    // ignore errors
    return false;
  }

  return false;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  return safeParse(window.localStorage.getItem(AUTH_USER_KEY));
}

export function saveAuth(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(AUTH_TOKEN_KEY) !== token) {
    fetchMeCache = null;
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  window.localStorage.setItem(REFRESH_SESSION_HINT_KEY, "1");
}

export function updateStoredUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  fetchMeCache = null;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.localStorage.removeItem(REFRESH_SESSION_HINT_KEY);
}

export function dispatchAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function buildAuthHeaders(initialHeaders?: HeadersInit, body?: BodyInit | null) {
  const headers = new Headers(initialHeaders as HeadersInit);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body != null && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = buildAuthHeaders(init.headers || {}, init.body ?? null);
  const res = await fetch(input, {
    ...init,
    credentials: init.credentials ?? "include",
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined" && (getAuthToken() || hasRefreshSessionHint())) {
    const refreshed = await refreshFromCookie();
    if (refreshed) {
      const retryHeaders = buildAuthHeaders(init.headers || {}, init.body ?? null);
      return fetch(input, {
        ...init,
        credentials: init.credentials ?? "include",
        headers: retryHeaders,
      });
    }

    if (getAuthToken()) {
      clearAuth();
      dispatchAuthChange();
    }
  }

  return res;
}

export async function refreshFromCookie() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(ENDPOINTS.AUTH_REFRESH, { method: "POST", credentials: "include" });
      const data = await parseJsonSafe(res).catch(() => null);
      const token = data?.success && data.data?.token;
      const user = data?.success && data.data?.user;
      if (!res.ok || typeof token !== "string" || !user) return null;

      saveAuth(token, user);
      dispatchAuthChange();
      return { token, user };
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function logout() {
  try {
    const headers = buildAuthHeaders({}, null);
    await fetch(ENDPOINTS.AUTH_LOGOUT, {
      method: "POST",
      credentials: "include",
      headers,
    });
  } finally {
    clearAuth();
    dispatchAuthChange();
  }
}

export async function register(email: string, password: string) {
  const response = await fetch(ENDPOINTS.AUTH_REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonSafe(response);
}

export async function login(email: string, password: string) {
  const response = await fetch(ENDPOINTS.AUTH_LOGIN, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonSafe(response);
}

export async function fetchMe(): Promise<ApiResponse<AuthUser>> {
  const token = getAuthToken();
  if (token && fetchMeCache?.token === token && fetchMeCache.expiresAt > Date.now()) {
    return fetchMeCache.response;
  }

  const request = fetchMePromise ?? (fetchMePromise = (async () => {
    const response = await authFetch(ENDPOINTS.AUTH_ME, { method: "GET" });
    return await parseJsonSafe(response) as ApiResponse<AuthUser>;
  })());

  try {
    const response = await request;
    if (token && response.success && response.data) {
      fetchMeCache = {
        token,
        expiresAt: Date.now() + FETCH_ME_CACHE_MS,
        response,
      };
    }
    return response;
  } finally {
    if (fetchMePromise === request) {
      fetchMePromise = null;
    }
  }
}

export async function getReadingHistory(book_url: string) {
  const response = await authFetch(`${ENDPOINTS.USER_HISTORY}?book_url=${encodeURIComponent(book_url)}`, {
    method: "GET",
  });
  return (await parseJsonSafe(response)) as Promise<ApiResponse<ReadingHistory>>;
}

export async function saveReadingHistory(payload: {
  book_url: string;
  chapter_slug: string;
  chapter_url?: string;
  chapter_title: string;
}) {
  const response = await authFetch(ENDPOINTS.USER_HISTORY, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseJsonSafe(response);
}

export async function getLibraryStatus(book_url: string) {
  const response = await authFetch(`${ENDPOINTS.USER_LIBRARY}?book_url=${encodeURIComponent(book_url)}`, {
    method: "GET",
  });
  return (await parseJsonSafe(response)) as Promise<LibraryStatusResponse>;
}

export async function toggleLibrary(payload: {
  book_url: string;
  title_vi: string;
  cover_url?: string;
}) {
  const response = await authFetch(ENDPOINTS.USER_LIBRARY, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return parseJsonSafe(response);
}

export async function getLibraryList() {
  const response = await authFetch(ENDPOINTS.USER_LIBRARY_LIST, {
    method: "GET",
  });
  return parseJsonSafe(response);
}
