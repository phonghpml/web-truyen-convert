// Environment constants
export const CRAWLER_BASE_URL = (process.env.NEXT_PUBLIC_CRAWLER_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

// API Endpoints
export const ENDPOINTS = {
  BOOKS: `${CRAWLER_BASE_URL}/books`,
  BOOKS_MANUAL: `${CRAWLER_BASE_URL}/books/manual`,
  BOOKS_UPDATE: (bookId: string) => `${CRAWLER_BASE_URL}/books/${bookId}`,
  BOOKS_CHAPTERS: (bookId: string) => `${CRAWLER_BASE_URL}/books/${bookId}/chapters`,
  BOOKS_SEARCH: `${CRAWLER_BASE_URL}/books/search`,
  CHAPTERS: `${CRAWLER_BASE_URL}/chapters`,
  CHAPTER_UPDATE: (chapterId: string) => `${CRAWLER_BASE_URL}/chapters/${chapterId}`,
  CRAWLER_INFO: `${CRAWLER_BASE_URL}/get-basic-info`,
  CRAWLER_CHAPTERS: `${CRAWLER_BASE_URL}/get-chapters`,
  CRAWL_SUBMIT: `${CRAWLER_BASE_URL}/crawl/submit`,
  CRAWL_JOBS: `${CRAWLER_BASE_URL}/crawl/jobs`,
  CRAWL_BOOKS: `${CRAWLER_BASE_URL}/crawl/books`,
  VIDEOS: `${CRAWLER_BASE_URL}/videos`,
  AUTH_REGISTER: `${CRAWLER_BASE_URL}/auth/register`,
  AUTH_LOGIN: `${CRAWLER_BASE_URL}/auth/login`,
  AUTH_ME: `${CRAWLER_BASE_URL}/auth/me`,
  AUTH_REFRESH: `${CRAWLER_BASE_URL}/auth/refresh`,
  AUTH_LOGOUT: `${CRAWLER_BASE_URL}/auth/logout`,
  USER_HISTORY: `${CRAWLER_BASE_URL}/user/history`,
  USER_LIBRARY: `${CRAWLER_BASE_URL}/user/library`,
  USER_LIBRARY_LIST: `${CRAWLER_BASE_URL}/user/library/list`,
};

// UI Constants
export const ITEMS_PER_PAGE = 24;
export const BOOK_LIST_LIMIT = 24;

// Messages
export const MESSAGES = {
  LOADING: "Đang tải...",
  SEARCH_LOADING: "Đang tìm kiếm...",
  NO_RESULTS: "Không tìm thấy kết quả",
  NO_BOOKS: "Chưa có truyện nào trong database",
  ERROR: "Có lỗi xảy ra",
  ERROR_FETCH_BOOKS: "Lỗi khi tải danh sách truyện",
  ERROR_SEARCH: "Lỗi khi tìm kiếm",
  ERROR_BOOK_DETAILS: "Lỗi khi tải chi tiết truyện",
  ERROR_CONVERT: "Lỗi convert truyện. Kiểm tra lại URL",
  NO_BOOK_FOUND: "Không tìm thấy truyện",
};
