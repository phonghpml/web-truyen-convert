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
export const getBookLink = (slug: string): string => {
  return `/book/${encodeBookId(slug)}`;
};

/**
 * Get search link
 */
export const getSearchLink = (query: string): string => {
  return `/search/${encodeURIComponent(query)}`;
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

export const parseChapterNum = (title: string): number => {
  const m = title.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[0]) : 0;
};