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
