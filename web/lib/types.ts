export interface Book {
  _id?: string;
  source_url: string;
  title_vi: string;
  title_en?: string;
  cover_url?: string;
  chapters_count: number;
  views_count?: number;
  updated_at?: string;
  [key: string]: any;
}

export interface Chapter {
  title: string;
  url: string;
  [key: string]: any;
}

export interface ChapterDetail extends Chapter {
  content?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BooksApiResponse extends ApiResponse<Book[]> {
  total?: number;
  limit?: number;
  skip?: number;
}

export interface ChaptersApiResponse extends ApiResponse<Chapter[]> {}

export interface SelectedChapter {
  title: string;
  url: string;
}

// Thêm vào cuối file web/lib/types.ts

export interface ReadingHistory {
  _id?: string;
  userEmail: string;    // Email người dùng từ NextAuth
  book_url: string;     // Link gốc của bộ truyện (source_url)
  chapter_url: string;  // Link chương đang đọc dở
  chapter_title: string; // Tên chương đang đọc dở
  updated_at: string | Date;
}

// Interface này dùng để hứng dữ liệu trả về từ API
export interface HistoryApiResponse extends ApiResponse<ReadingHistory> {}
