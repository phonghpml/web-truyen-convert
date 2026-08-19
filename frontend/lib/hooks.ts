"use client";

import { useState, useEffect, useMemo } from "react";
import { authFetch } from "./auth";
import { Book, Chapter, Video, ApiResponse } from "./types";
import { ENDPOINTS, MESSAGES } from "./constants";

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic fetch hook
 */
export function useFetch<T>(
  url: string | null,
  options?: RequestInit
): UseFetchState<T> {
    const initialState = useMemo<UseFetchState<T>>(
      () => ({ data: null, loading: false, error: null }),
      []
    );

    const [state, setState] = useState<UseFetchState<T>>(initialState);

    useEffect(() => {
      if (!url) {
        return;
      }

      const fetchData = async () => {
        try {
          setState((prev) => ({ ...prev, loading: true, error: null }));
          const response = await fetch(url, options);
          const result: ApiResponse<T> = await response.json();

          if (result.success && result.data) {
            setState({ data: result.data, loading: false, error: null });
          } else {
            setState({
              data: null,
              loading: false,
              error: result.error || MESSAGES.ERROR,
            });
          }
        } catch (err) {
          console.error("Fetch error:", err);
          setState({
            data: null,
            loading: false,
            error: MESSAGES.ERROR,
          });
        }
      };

      fetchData();
    }, [url, options]);

    if (!url) {
      return initialState;
    }

    return state;
  }

/**
 * Fetch books with limit
 */
export function useBooks(limit: number = 24) {
  return useFetch<Book[]>(`${ENDPOINTS.BOOKS}?limit=${limit}`);
}

/**
 * Fetch book by source_url or _id
 */
export async function fetchBook(
  slug: string
): Promise<{ book: Book | null; error: string | null }> {
  try {
    const decodedSlug = decodeURIComponent(slug);

    // Try by source_url first
    let response = await fetch(
      `${ENDPOINTS.BOOKS}?slug=${encodeURIComponent(decodedSlug)}`
    );
    let data: ApiResponse<Book[]> = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      return { book: data.data[0], error: null };
    }

    // Try by _id
    response = await fetch(
      `${ENDPOINTS.BOOKS}?id=${encodeURIComponent(decodedSlug)}`
    );
    data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      return { book: data.data[0], error: null };
    }

    // Try by source_url in case the slug is actually an encoded external URL
    response = await fetch(
      `${ENDPOINTS.BOOKS}?source_url=${encodeURIComponent(decodedSlug)}`
    );
    data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      return { book: data.data[0], error: null };
    }

    return { book: null, error: MESSAGES.NO_BOOK_FOUND };
  } catch (err) {
    console.error("Error fetching book:", err);
    return { book: null, error: MESSAGES.ERROR_BOOK_DETAILS };
  }
}

/**
 * Fetch chapters for a book
 */
export async function fetchChapters(
  sourceUrl: string
): Promise<{ chapters: Chapter[]; error: string | null }> {
  try {
    const response = await fetch(
      `${ENDPOINTS.CHAPTERS}?book=${encodeURIComponent(sourceUrl)}`
    );
    const data: ApiResponse<Chapter[]> = await response.json();

    if (data.success && data.data) {
      return { chapters: data.data, error: null };
    }

    return { chapters: [], error: null };
  } catch (err) {
    console.error("Error fetching chapters:", err);
    return { chapters: [], error: MESSAGES.ERROR };
  }
}

export async function fetchBookVideos(
  sourceUrl: string
): Promise<{ videos: Video[]; error: string | null }> {
  try {
    const response = await fetch(
      `${ENDPOINTS.VIDEOS}?book_url=${encodeURIComponent(sourceUrl)}`
    );
    const data: ApiResponse<Video[]> = await response.json();

    if (data.success && data.data) {
      return { videos: data.data, error: null };
    }

    return { videos: [], error: null };
  } catch (err) {
    console.error("Error fetching book videos:", err);
    return { videos: [], error: MESSAGES.ERROR };
  }
}

export async function deleteVideo(videoId: string) {
  try {
    const response = await authFetch(`${ENDPOINTS.VIDEOS}/${encodeURIComponent(videoId)}`, {
      method: "DELETE",
    });
    return await response.json();
  } catch (err) {
    console.error("Error deleting video:", err);
    return { success: false, error: MESSAGES.ERROR };
  }
}

export async function deleteBook(bookId: string) {
  try {
    const response = await authFetch(`${ENDPOINTS.CRAWL_BOOKS}/${encodeURIComponent(bookId)}`, {
      method: "DELETE",
    });
    return await response.json();
  } catch (err) {
    console.error("Error deleting book:", err);
    return { success: false, error: MESSAGES.ERROR };
  }
}

export async function publishVideoToYouTube(videoId: string) {
  try {
    const url = new URL(`${ENDPOINTS.VIDEOS}/${encodeURIComponent(videoId)}/publish-youtube`);

    const response = await authFetch(url.toString(), {
      method: "POST",
    });
    return await response.json();
  } catch (err) {
    console.error("Error publishing video to YouTube:", err);
    return { success: false, error: MESSAGES.ERROR };
  }
}

/**
 * Search books
 */
export async function searchBooks(
  query: string
): Promise<{ books: Book[]; error: string | null }> {
  try {
    const response = await fetch(
      `${ENDPOINTS.BOOKS_SEARCH}?q=${encodeURIComponent(query)}`
    );
    const data: ApiResponse<Book[]> = await response.json();

    if (data.success && data.data) {
      return { books: data.data, error: null };
    }

    return { books: [], error: MESSAGES.NO_RESULTS };
  } catch (err) {
    console.error("Search error:", err);
    return { books: [], error: MESSAGES.ERROR_SEARCH };
  }
}

/**
 * Get backend info
 */
export async function getCrawlerInfo(url: string) {
  try {
    const response = await fetch(ENDPOINTS.CRAWLER_INFO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return await response.json();
  } catch (err) {
    console.error("Crawler error:", err);
    throw err;
  }
}

/**
 * Get backend chapters
 */
export async function getCrawlerChapters(url: string) {
  try {
    const response = await fetch(ENDPOINTS.CRAWLER_CHAPTERS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return await response.json();
  } catch (err) {
    console.error("Crawler error:", err);
    throw err;
  }
}

