"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/lib/useAuth";
import { deleteBook } from "@/lib/hooks";
import { ENDPOINTS, MESSAGES } from "@/lib/constants";
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
    </div>
  );
}
