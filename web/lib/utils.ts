/**
 * URL utilities
 */

/**
 * Encode book identifier for URL
 */
export const encodeBookId = (id: string): string => {
  return encodeURIComponent(id);
};

/**
 * Decode book identifier from URL
 */
export const decodeBookId = (id: string): string => {
  return decodeURIComponent(id);
};

/**
 * Get book link
 */
export const getBookLink = (bookId: string): string => {
  return `/book/${encodeBookId(bookId)}`;
};

/**
 * Get search link
 */
export const getSearchLink = (query: string): string => {
  return `/search/${encodeBookId(query)}`;
};

/**
 * Check if string is a valid URL
 */
export const isValidUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return str.includes("96shuba") || str.includes("http");
  }
};

/**
 * Get book identifier (priority: source_url > _id)
 */
export const getBookId = (book: { source_url?: string; _id?: string }): string | null => {
  return book.source_url || book._id || null;
};

export const parseChapterNum = (title: string): number => {
  const m = title.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[0]) : 0;
};