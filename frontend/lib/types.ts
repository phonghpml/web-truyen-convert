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
  author_vi?: string;
  description_vi?: string;
  chapters_count: number;
  views_count?: number;
  updated_at?: string;
  [key: string]: unknown;
}

export interface Chapter {
  id?: string;
  _id?: string;
  title: string;
  title_vi?: string;
  url: string;
  [key: string]: unknown;
  slug: string;
  chapter_no: number;
  updated_at?: string;
  book_source_url?: string;
  access?: "regular" | "vip" | "unvip";
}

export interface ChapterDetail extends Chapter {
  content?: string;
}

export interface ApiResponse<T = unknown> {
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

export type ChaptersApiResponse = ApiResponse<Chapter[]>;

export interface Video {
  id?: string;
  book_url: string;
  video_url: string;
  chapter_start: number;
  chapter_count: number;
  voice: string;
  rate: string;
  job_id: string;
  thumbnail_url?: string;
  book_title?: string;
  author_name?: string;
  video_title?: string;
  video_description?: string;
  video_tags?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SelectedChapter {
  title: string;
  url: string;
}

export interface AuthUser {
  email: string;
  name?: string;
  role?: string;
}

export type AuthResponse = ApiResponse<{
  token: string;
  user: AuthUser;
}>;

export type LibraryStatusResponse = ApiResponse<{ isSaved: boolean }>;

export interface ReadingHistory {
  _id?: string;
  userEmail: string;
  book_url: string;
  chapter_slug: string;
  chapter_title: string;
  chapter_url?: string;
  updated_at: string | Date;
}

export type HistoryApiResponse = ApiResponse<ReadingHistory>;
