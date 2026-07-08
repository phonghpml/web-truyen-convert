export interface User {
  _id?: string;
  email: string;
  password: string; // Lưu hash mật khẩu
}

export interface Book {
  id?: string;
  _id?: string;
  source_url: string;
  slug: string;
  title_vi: string;
  title_en?: string;
  cover_url?: string;
  chapters_count: number;
  views_count?: number;
  updated_at?: string;
  [key: string]: any;
}

export interface Chapter {
  id?: string;
  _id?: string;
  title: string;
  url: string;
  [key: string]: any;
  slug: string;
  chapter_no: number;
  updated_at?: string;
  book_source_url?: string;
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

export interface ChaptersApiResponse extends ApiResponse<Chapter[]> { }

export interface SelectedChapter {
  title: string;
  url: string;
}

export interface AuthUser {
  email: string;
  name?: string;
}

export interface AuthResponse extends ApiResponse<{
  token: string;
  user: AuthUser;
}> {}

export interface LibraryStatusResponse extends ApiResponse<{ isSaved: boolean }> {}

export interface ReadingHistory {
  _id?: string;
  userEmail: string;
  book_url: string;
  chapter_slug: string;
  chapter_title: string;
  chapter_url?: string;
  updated_at: string | Date;
}

export interface HistoryApiResponse extends ApiResponse<ReadingHistory> { }
