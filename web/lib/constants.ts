// Environment constants
export const API_BASE_URL = "/api";
export const CRAWLER_BASE_URL = process.env.NEXT_PUBLIC_CRAWLER_URL || "http://127.0.0.1:8000";

// API Endpoints
export const ENDPOINTS = {
  BOOKS: `${API_BASE_URL}/books`,
  BOOKS_SEARCH: `${API_BASE_URL}/books/search`,
  CHAPTERS: `${API_BASE_URL}/chapters`,
  CRAWLER_INFO: `${CRAWLER_BASE_URL}/get-basic-info`,
  CRAWLER_CHAPTERS: `${CRAWLER_BASE_URL}/get-chapters`,
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
