"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Plus, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/lib/useAuth";
import { deleteBook } from "@/lib/hooks";
import { ENDPOINTS, MESSAGES } from "@/lib/constants";
import { authFetch } from "@/lib/auth";
import type { Book } from "@/lib/types";

interface BookRow extends Book {
  selected?: boolean;
}

export default function AdminBooksPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [bookSearch, setBookSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingChapters, setEditingChapters] = useState<Array<{ id?: string; title: string; title_vi: string; content: string; chapter_no: number; url?: string; is_deleted?: boolean }>>([]);
  const [expandedExistingChapters, setExpandedExistingChapters] = useState<Record<string, boolean>>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [bookForm, setBookForm] = useState({
    title_vi: "",
    title_en: "",
    author_vi: "",
    description_vi: "",
    cover_url: "",
    source_url: "",
    slug: "",
  });
  const [chaptersDraft, setChaptersDraft] = useState<Array<{ title: string; title_vi: string; content: string }>>([
    { title: "", title_vi: "", content: "" },
  ]);
  const [bulkChapterText, setBulkChapterText] = useState("");

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isLoading, router]);

  const selectedCount = useMemo(
    () => books.filter((item) => item.selected).length,
    [books]
  );

  const filteredBooks = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();
    return books.filter((book) => {
      if (!query) return true;
      return [book.title_vi, book.title_en, book.slug, book.author_vi].some((value) =>
        value?.toLowerCase().includes(query)
      );
    });
  }, [bookSearch, books]);

  const loadBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${ENDPOINTS.BOOKS}?limit=200`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setBooks(result.data.map((book: Book) => ({ ...book, selected: false })));
      } else {
        setError(result.error || "Không thể tải danh sách sách");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi khi kết nối tới máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBooks();
  }, []);

  const toggleSelect = (bookId: string) => {
    setBooks((prev) =>
      prev.map((book) =>
        book.id === bookId ? { ...book, selected: !book.selected } : book
      )
    );
  };

  const selectAll = () => {
    const allSelected = selectedCount === books.length;
    setBooks((prev) => prev.map((book) => ({ ...book, selected: !allSelected })));
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa sách này và toàn bộ dữ liệu liên quan?")) {
      return;
    }
    setBulkLoading(true);
    setMessage(null);
    try {
      const result = await deleteBook(bookId);
      if (!result.success) {
        setError(result.error || "Xóa sách không thành công");
        return;
      }
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
      setMessage("Đã xóa sách thành công.");
    } catch (err) {
      console.error(err);
      setError("Xóa sách thất bại");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedCount) return;
    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedCount} sách đã chọn?`)) {
      return;
    }

    setBulkLoading(true);
    setError(null);
    setMessage(null);
    try {
      const selectedBooks = books.filter((book) => book.selected && book.id);
      const results = await Promise.all(selectedBooks.map((book) => deleteBook(book.id!)));
      const failures = results.filter((item) => !item.success).length;
      if (failures) {
        setError(`${failures}/${selectedBooks.length} sách xóa không thành công.`);
      } else {
        setMessage(`Đã xóa ${selectedBooks.length} sách.`);
      }
      setBooks((prev) => prev.filter((book) => !book.selected));
    } catch (err) {
      console.error(err);
      setError("Xóa sách hàng loạt thất bại");
    } finally {
      setBulkLoading(false);
    }
  };

  const resetCreateForm = () => {
    setBookForm({
      title_vi: "",
      title_en: "",
      author_vi: "",
      description_vi: "",
      cover_url: "",
      source_url: "",
      slug: "",
    });
    setEditingChapters([]);
    setChaptersDraft([{ title: "", title_vi: "", content: "" }]);
    setBulkChapterText("");
  };

  const addChapterDraft = () => {
    setChaptersDraft((prev) => [...prev, { title: "", title_vi: "", content: "" }]);
  };

  const removeChapterDraft = (index: number) => {
    setChaptersDraft((prev) => {
      if (prev.length === 1) return [{ title: "", title_vi: "", content: "" }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateChapterDraft = (index: number, field: "title" | "title_vi" | "content", value: string) => {
    setChaptersDraft((prev) => prev.map((chapter, i) => (i === index ? { ...chapter, [field]: value } : chapter)));
  };

  const buildValidChapters = (draft: typeof chaptersDraft) =>
    draft
      .map((chapter) => ({
        title: chapter.title.trim() || chapter.title_vi.trim() || "",
        title_vi: chapter.title_vi.trim() || chapter.title.trim() || "",
        content: chapter.content.trim(),
      }))
      .filter((chapter) => chapter.title || chapter.title_vi || chapter.content.trim());

  const handleCreateBook = async () => {
    if (!bookForm.title_vi.trim()) {
      setError("Tên truyện không được để trống");
      return;
    }

    const validChapters = buildValidChapters(chaptersDraft);

    setCreateLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        title_vi: bookForm.title_vi.trim(),
        title_en: bookForm.title_en.trim() || null,
        author_vi: bookForm.author_vi.trim() || null,
        description_vi: bookForm.description_vi.trim() || null,
        cover_url: bookForm.cover_url.trim() || null,
        source_url: bookForm.source_url.trim() || "",
        slug: bookForm.slug.trim() || "",
        bulk_chapter_text: bulkChapterText.trim(),
        chapters: validChapters.map((chapter, index) => ({
          title: chapter.title || `Chương ${index + 1}`,
          title_vi: chapter.title_vi || chapter.title || `Chương ${index + 1}`,
          content: chapter.content,
          chapter_no: index + 1,
        })),
      };

      const response = await authFetch(ENDPOINTS.BOOKS_MANUAL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.detail || "Không thể tạo sách mới");
      }

      setShowCreateModal(false);
      resetCreateForm();
      await loadBooks();
      setMessage("Đã tạo sách và chương mới thành công.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Không thể tạo sách mới");
    } finally {
      setCreateLoading(false);
    }
  };

  const loadExistingBookChapters = async (book: Book) => {
    if (!book.id) {
      setEditingChapters([]);
      return;
    }

    try {
      const response = await authFetch(ENDPOINTS.BOOKS_CHAPTERS(book.id), { method: "GET" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.detail || "Không thể tải danh sách chương");
      }

      const chapters = Array.isArray(result.data) ? result.data : [];
      setEditingChapters(
        chapters.map((chapter: any) => ({
          id: chapter.id,
          title: chapter.title || "",
          title_vi: chapter.title_vi || chapter.title || "",
          content: chapter.content || "",
          chapter_no: chapter.chapter_no || 1,
          url: chapter.url || "",
          is_deleted: false,
        }))
      );
    } catch (err) {
      console.error(err);
      setEditingChapters([]);
    }
  };

  const openEditModal = async (book: Book) => {
    setEditingBookId(book.id ?? null);
    setShowEditModal(true);
    setBulkChapterText("");
    setBookForm({
      title_vi: book.title_vi || "",
      title_en: book.title_en || "",
      author_vi: book.author_vi || "",
      description_vi: book.description_vi || "",
      cover_url: book.cover_url || "",
      source_url: book.source_url || "",
      slug: book.slug || "",
    });
    setChaptersDraft([{ title: "", title_vi: "", content: "" }]);
    await loadExistingBookChapters(book);
  };

  const handleUpdateExistingChapter = (chapterId: string | undefined, field: "title" | "title_vi" | "content" | "chapter_no", value: string | number) => {
    setEditingChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, [field]: value } : chapter
      )
    );
  };

  const removeExistingChapter = (chapterId: string | undefined) => {
    if (!chapterId) return;
    setEditingChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, is_deleted: true } : chapter
      )
    );
    setExpandedExistingChapters((prev) => {
      const next = { ...prev };
      delete next[chapterId ?? ""];
      return next;
    });
  };

  const toggleExistingChapterContent = (chapterId: string | undefined, shouldOpen?: boolean) => {
    if (!chapterId) return;
    setExpandedExistingChapters((prev) => ({
      ...prev,
      [chapterId]: shouldOpen ?? !prev[chapterId],
    }));
  };

  const handleUpdateBook = async () => {
    if (!editingBookId) return;
    if (!bookForm.title_vi.trim()) {
      setError("Tên truyện không được để trống");
      return;
    }

    const validChapters = buildValidChapters(chaptersDraft);

    setCreateLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        title_vi: bookForm.title_vi.trim(),
        title_en: bookForm.title_en.trim() || null,
        author_vi: bookForm.author_vi.trim() || null,
        description_vi: bookForm.description_vi.trim() || null,
        cover_url: bookForm.cover_url.trim() || null,
        source_url: bookForm.source_url.trim() || "",
        slug: bookForm.slug.trim() || "",
        bulk_chapter_text: bulkChapterText.trim(),
        existing_chapters: editingChapters
          .filter((chapter) => chapter.id && !chapter.is_deleted)
          .map((chapter) => ({
            id: chapter.id,
            title: chapter.title.trim() || chapter.title_vi.trim() || "",
            title_vi: chapter.title_vi.trim() || chapter.title.trim() || "",
            content: chapter.content.trim(),
            chapter_no: Number(chapter.chapter_no) || 1,
          })),
        removed_chapter_ids: editingChapters
          .filter((chapter) => chapter.id && chapter.is_deleted)
          .map((chapter) => chapter.id as string),
        chapters: validChapters.map((chapter, index) => ({
          title: chapter.title || `Chương ${index + 1}`,
          title_vi: chapter.title_vi || chapter.title || `Chương ${index + 1}`,
          content: chapter.content,
          chapter_no: index + 1,
        })),
      };

      const response = await authFetch(ENDPOINTS.BOOKS_UPDATE(editingBookId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.detail || "Không thể cập nhật sách");
      }

      setShowEditModal(false);
      setEditingBookId(null);
      resetCreateForm();
      await loadBooks();
      setMessage("Đã cập nhật thông tin sách và thêm chương mới thành công.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Không thể cập nhật sách");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <Navbar />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl border border-zinc-800 bg-[#101010] p-6 shadow-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-orange-400">Quản lý sách</h1>
              <p className="text-sm text-zinc-500">Quản lý sách và thao tác xóa sách tương tự giao diện quản lý video.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-500 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-300 transition hover:bg-orange-500 hover:text-black"
            >
              <Plus size={16} />
              Thêm mới
            </button>
          </div>
          {message ? <div className="mt-4 rounded-2xl border border-emerald-500/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">{message}</div> : null}
          {error ? <div className="mt-4 rounded-2xl border border-red-500/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</div> : null}
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-[#101010] p-6 shadow-xl">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Danh sách sách</h2>
                <p className="text-sm text-zinc-500">Tìm kiếm và quản lý sách giống giao diện quản lý video.</p>
              </div>
              <div className="w-full sm:w-auto">
                <input
                  value={bookSearch}
                  onChange={(event) => setBookSearch(event.target.value)}
                  placeholder="Tìm theo tiêu đề, tác giả hoặc slug"
                  className="w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#101010] px-4 py-3">
              <span className="text-sm text-zinc-400">{selectedCount} sách đã chọn / {filteredBooks.length}</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={selectAll} className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-950/30 transition disabled:cursor-not-allowed disabled:opacity-40">Chọn tất cả</button>
                <button type="button" onClick={loadBooks} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-950/30 transition disabled:cursor-not-allowed disabled:opacity-40">Làm mới</button>
                <button type="button" onClick={handleBulkDelete} disabled={!selectedCount || bulkLoading} className="inline-flex items-center gap-2 rounded-lg border border-red-700 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30 transition disabled:cursor-not-allowed disabled:opacity-40">Xóa đã chọn</button>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-300">Đang tải sách...</div>
            ) : filteredBooks.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-300">Không tìm thấy sách phù hợp.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/90">
                <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                  <thead className="bg-black text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                    <tr>
                      <th className="w-12 px-4 py-4">
                        <button
                          type="button"
                          onClick={selectAll}
                          className={`grid h-5 w-5 place-items-center rounded border ${selectedCount === filteredBooks.length && filteredBooks.length > 0 ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-600"}`}
                        >
                          {selectedCount === filteredBooks.length && filteredBooks.length > 0 ? <Check size={14} /> : null}
                        </button>
                      </th>
                      <th className="px-4 py-4">Sách</th>
                      <th className="px-4 py-4">Tác giả</th>
                      <th className="px-4 py-4">Số chương</th>
                      <th className="px-4 py-4">Cập nhật</th>
                      <th className="sticky right-0 z-10 bg-black px-4 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.9)]">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredBooks.map((book) => {
                      const selected = Boolean(book.selected);
                      return (
                        <tr key={book.id || book.source_url} className={selected ? "bg-orange-950/10" : "hover:bg-white/[0.02]"}>
                          <td className="px-4 py-4 align-top">
                            <button
                              type="button"
                              onClick={() => toggleSelect(book.id ?? "")}
                              className={`grid h-5 w-5 place-items-center rounded border ${selected ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-600"}`}
                            >
                              {selected ? <Check size={14} /> : null}
                            </button>
                          </td>
                          <td className="max-w-[300px] px-4 py-4 align-top">
                            <div className="truncate font-semibold text-white">{book.title_vi || book.title_en || book.slug}</div>
                            <div className="mt-1 text-xs text-zinc-500" title={book.source_url}>{book.source_url}</div>
                          </td>
                          <td className="px-4 py-4 align-top"><div className="truncate text-zinc-200">{book.author_vi || "-"}</div></td>
                          <td className="px-4 py-4 align-top text-xs text-zinc-400">{book.chapters_count ?? 0}</td>
                          <td className="whitespace-nowrap px-4 py-4 align-top text-xs text-zinc-500">{book.updated_at ? new Date(book.updated_at).toLocaleString("vi-VN") : "-"}</td>
                          <td className="sticky right-0 z-[1] bg-zinc-950 px-4 py-4 align-top shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.9)]">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(book)}
                                title="Sửa"
                                className="rounded-lg border border-zinc-600 p-2 text-zinc-200 hover:bg-zinc-900"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBook(book.id ?? "")}
                                disabled={bulkLoading}
                                title="Xóa"
                                className="rounded-lg border border-red-700 p-2 text-red-300 hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-zinc-800 bg-[#101010] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-orange-400">{showEditModal ? "Sửa truyện" : "Thêm truyện mới"}</h2>
                <p className="text-sm text-zinc-500">{showEditModal ? "Chỉnh sửa thông tin sách và thêm chương mới." : "Nhập thông tin sách và thêm chương với nội dung tự soạn."}</p>
              </div>
              <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); setEditingBookId(null); resetCreateForm(); }} className="rounded-lg border border-zinc-700 p-2 text-zinc-300 hover:bg-zinc-900">
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Tên truyện</span>
                <input value={bookForm.title_vi} onChange={(e) => setBookForm((prev) => ({ ...prev, title_vi: e.target.value }))} className="w-full rounded-2xl border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-orange-500" placeholder="Ví dụ: Độc Cô Cầu Bại" />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Slug</span>
                <input value={bookForm.slug} onChange={(e) => setBookForm((prev) => ({ ...prev, slug: e.target.value }))} className="w-full rounded-2xl border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-orange-500" placeholder="Tự tạo nếu bỏ trống" />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Tên tiếng Anh</span>
                <input value={bookForm.title_en} onChange={(e) => setBookForm((prev) => ({ ...prev, title_en: e.target.value }))} className="w-full rounded-2xl border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-orange-500" placeholder="(Không bắt buộc)" />
              </label>
              <label className="space-y-2 text-sm text-zinc-300">
                <span>Tác giả</span>
                <input value={bookForm.author_vi} onChange={(e) => setBookForm((prev) => ({ ...prev, author_vi: e.target.value }))} className="w-full rounded-2xl border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-orange-500" placeholder="Ví dụ: Tác giả A" />
              </label>
              <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
                <span>Link nguồn / URL</span>
                <input value={bookForm.source_url} onChange={(e) => setBookForm((prev) => ({ ...prev, source_url: e.target.value }))} className="w-full rounded-2xl border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-orange-500" placeholder="https://... hoặc để trống" />
              </label>
              <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
                <span>Ảnh bìa</span>
                <input value={bookForm.cover_url} onChange={(e) => setBookForm((prev) => ({ ...prev, cover_url: e.target.value }))} className="w-full rounded-2xl border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-orange-500" placeholder="https://..." />
              </label>
              <label className="space-y-2 text-sm text-zinc-300 md:col-span-2">
                <span>Mô tả</span>
                <textarea value={bookForm.description_vi} onChange={(e) => setBookForm((prev) => ({ ...prev, description_vi: e.target.value }))} rows={4} className="w-full rounded-2xl border border-zinc-700 bg-black px-3 py-3 text-white outline-none focus:border-orange-500" placeholder="Tóm tắt truyện" />
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="mb-5 rounded-2xl border border-dashed border-orange-500/40 bg-orange-950/10 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-orange-300">Nội dung nhiều chương</h3>
                </div>
                <textarea
                  value={bulkChapterText}
                  onChange={(e) => setBulkChapterText(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white outline-none focus:border-orange-500"
                  placeholder="Dán nội dung gồm nhiều chương theo mẫu: Chương 1: ...\n\nNội dung ...\n\nChương 2: ...\n\nNội dung ...\n\nHệ thống sẽ tự động tách thành nhiều chương."
                />
                <p className="mt-2 text-xs text-zinc-400">Hỗ trợ nhập theo định dạng Chương 1, Chapter 2 hoặc text dài liên tục. Hệ thống sẽ tự động chia thành nhiều chương.</p>
              </div>

              {showEditModal && (
                <div className="mb-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300">Chương hiện có</h3>
                  </div>

                  {editingChapters.filter((chapter) => !chapter.is_deleted).length > 0 ? (
                    <div className="space-y-4">
                      {editingChapters
                        .filter((chapter) => !chapter.is_deleted)
                        .map((chapter, index) => (
                          <div key={chapter.id || `existing-${index}`} className="rounded-2xl border border-zinc-800 bg-black/50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <span className="text-xs font-black uppercase tracking-wider text-zinc-500">Chương {chapter.chapter_no || index + 1}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExistingChapterContent(chapter.id)}
                                  className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-900"
                                >
                                  {expandedExistingChapters[chapter.id ?? ""] ? "Ẩn nội dung cũ" : "Hiện nội dung cũ"}
                                </button>
                                <button type="button" onClick={() => removeExistingChapter(chapter.id)} className="rounded-lg border border-red-700 px-2 py-1 text-xs text-red-300 hover:bg-red-950/30">Xóa</button>
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <input value={chapter.title_vi} onChange={(e) => handleUpdateExistingChapter(chapter.id, "title_vi", e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500" placeholder="Tên chương" />
                              <input value={chapter.title} onChange={(e) => handleUpdateExistingChapter(chapter.id, "title", e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500" placeholder="Tên chương (ngắn)" />
                            </div>
                            <input value={chapter.chapter_no} onChange={(e) => handleUpdateExistingChapter(chapter.id, "chapter_no", Number(e.target.value) || 1)} className="mt-3 w-32 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500" placeholder="Số chương" />

                            {!expandedExistingChapters[chapter.id ?? ""] ? (
                              <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-950/80 p-3 text-sm text-zinc-300">
                                <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Nội dung cũ</div>
                                <div className="max-h-20 overflow-hidden whitespace-pre-wrap text-zinc-300">
                                  {chapter.content?.trim() ? chapter.content.trim().slice(0, 220) + (chapter.content.trim().length > 220 ? "..." : "") : "(Chưa có nội dung)"}
                                </div>
                              </div>
                            ) : (
                              <textarea value={chapter.content} onChange={(e) => handleUpdateExistingChapter(chapter.id, "content", e.target.value)} rows={8} className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500" placeholder="Nội dung chương..." />
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="mb-3 text-sm text-zinc-500">Chưa có chương nào được lưu cho truyện này.</div>
                  )}
                </div>
              )}

              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300">{showEditModal ? "Thêm chương mới" : "Danh sách chương"}</h3>
                <button type="button" onClick={addChapterDraft} className="rounded-lg border border-orange-500 px-3 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500 hover:text-black">+ Thêm chương</button>
              </div>

              <div className="space-y-4">
                {chaptersDraft.map((chapter, index) => (
                  <div key={index} className="rounded-2xl border border-zinc-800 bg-black/50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-500">{showEditModal ? "Chương mới" : `Chương ${index + 1}`}</span>
                      {chaptersDraft.length > 1 && (
                        <button type="button" onClick={() => removeChapterDraft(index)} className="rounded-lg border border-red-700 px-2 py-1 text-xs text-red-300 hover:bg-red-950/30">Xóa</button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={chapter.title_vi || chapter.title} onChange={(e) => updateChapterDraft(index, "title_vi", e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500" placeholder="Tên chương" />
                      <input value={chapter.title} onChange={(e) => updateChapterDraft(index, "title", e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500" placeholder="Tên chương (ngắn)" />
                    </div>
                    <textarea value={chapter.content} onChange={(e) => updateChapterDraft(index, "content", e.target.value)} rows={8} className="mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-orange-500" placeholder="Nội dung chương..." />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); setEditingBookId(null); resetCreateForm(); }} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900">Hủy</button>
              <button type="button" onClick={showEditModal ? handleUpdateBook : handleCreateBook} disabled={createLoading} className="rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-60">
                {createLoading ? "Đang lưu..." : showEditModal ? "Lưu thay đổi" : "Tạo truyện"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
