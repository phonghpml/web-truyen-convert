import { ENDPOINTS } from "./constants";
import type { AuthUser, ApiResponse, LibraryStatusResponse, ReadingHistory } from "./types";

const AUTH_TOKEN_KEY = "web_truyen_auth_token";
const AUTH_USER_KEY = "web_truyen_auth_user";

function safeParse(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  return safeParse(window.localStorage.getItem(AUTH_USER_KEY));
}

export function saveAuth(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

function buildAuthHeaders(initialHeaders?: HeadersInit) {
  const headers = new Headers(initialHeaders as HeadersInit);
  const token = getAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

export async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = buildAuthHeaders(init.headers || {});
  return fetch(input, {
    ...init,
    headers,
  });
}

export async function register(email: string, password: string) {
  const response = await fetch(ENDPOINTS.AUTH_REGISTER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
}

export async function login(email: string, password: string) {
  const response = await fetch(ENDPOINTS.AUTH_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return response.json();
}

export async function fetchMe() {
  const response = await authFetch(ENDPOINTS.AUTH_ME, { method: "GET" });
  return response.json();
}

export async function getReadingHistory(book_url: string) {
  const response = await authFetch(`${ENDPOINTS.USER_HISTORY}?book_url=${encodeURIComponent(book_url)}`, {
    method: "GET",
  });
  return response.json() as Promise<ApiResponse<ReadingHistory>>;
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
  return response.json();
}

export async function getLibraryStatus(book_url: string) {
  const response = await authFetch(`${ENDPOINTS.USER_LIBRARY}?book_url=${encodeURIComponent(book_url)}`, {
    method: "GET",
  });
  return response.json() as Promise<LibraryStatusResponse>;
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
  return response.json();
}

export async function getLibraryList() {
  const response = await authFetch(ENDPOINTS.USER_LIBRARY_LIST, {
    method: "GET",
  });
  return response.json();
}
