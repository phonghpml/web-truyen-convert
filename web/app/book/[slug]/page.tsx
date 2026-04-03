"use client";

import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/ui/BookCard";
import { ChapterList } from "@/components/ui/ChapterList";
// BỎ: import ReaderModal from "@/components/ui/ReaderModal"; 
import { MESSAGES } from "@/lib/constants";
import { fetchBook, fetchChapters } from "@/lib/hooks";
import { Book, Chapter } from "@/lib/types";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session } = useSession();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [savedHistory, setSavedHistory] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  // THAY THẾ: Logic handleSelect mới để chuyển hướng thay vì mở Modal
  const handleSelect = useCallback((chapter: Chapter) => {
    if (!chapter.url) return;
    
    // 1. Lưu danh sách chương vào localStorage để trang [chapter_slug] dùng tính Next/Prev
    localStorage.setItem(`chapters_${slug}`, JSON.stringify(chapters));
    
    // 2. Chuyển hướng kèm theo URL gốc ở query để Backend cào dữ liệu
    const encodedUrl = encodeURIComponent(chapter.url);
    router.push(`/book/${slug}/${chapter.slug}?url=${encodedUrl}`);
  }, [chapters, slug, router]);

  const loadAllData = useCallback(async (showGlobalLoading = true) => {
    if (!slug) return;
    try {
      if (showGlobalLoading) setLoading(true);
      const { book: bookData, error: bookError } = await fetchBook(slug);

      if (bookError || !bookData) {
        setError(bookError || MESSAGES.NO_BOOK_FOUND);
        return;
      }

      setBook(bookData);

      const promises = [
        bookData.source_url ? fetchChapters(bookData.source_url) : Promise.resolve({ chapters: [] }),
        bookData.source_url ? fetch(`/api/user/history?book_url=${encodeURIComponent(bookData.source_url)}`).then(r => r.json()) : Promise.resolve(null),
        (bookData.source_url && session) ? fetch(`/api/user/library?book_url=${encodeURIComponent(bookData.source_url)}`).then(r => r.json()) : Promise.resolve(null)
      ];

      const [chaptersRes, historyRes, libraryRes] = await Promise.all(promises);

      if (chaptersRes.chapters) setChapters(chaptersRes.chapters);
      if (historyRes?.success) setSavedHistory(historyRes.data);
      if (libraryRes) setIsSaved(libraryRes.isSaved);

    } catch (err) {
      setError(MESSAGES.ERROR_BOOK_DETAILS);
    } finally {
      setLoading(false);
    }
  }, [slug, session]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSyncChapters = async () => {
    if (!book?.source_url) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_CRAWLER_URL}/get-chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: book.source_url })
      });
      const data = await response.json();
      if (data.success) await loadAllData(false);
    } catch (err) {
      alert("Lỗi khi kết nối với máy chủ cập nhật.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!session) return alert("Vui lòng đăng nhập!");
    const res = await fetch("/api/user/library", {
      method: "POST",
      body: JSON.stringify({
        book_url: book?.source_url,
        title_vi: book?.title_vi,
        cover_url: book?.cover_url
      })
    });
    const data = await res.json();
    setIsSaved(data.isSaved);
  };

  const firstChapter = useMemo(() => {
    if (chapters.length === 0) return null;
    return [...chapters].sort((a, b) =>
      (a.title_vi.match(/\d+/) || 0) - (b.title_vi.match(/\d+/) || 0)
    )[0];
  }, [chapters]);

  return (
    <main className="min-h-screen bg-black text-white font-mono p-4 md:p-6">
      <div className="max-w-5xl mx-auto w-full">
        <Navbar session={session} onHomeClick={() => router.push("/")} />

        <div className="mt-8 md:mt-12 space-y-6 md:space-y-8">
          {loading ? (
            <div className="flex flex-col items-center py-20 text-orange-500 animate-pulse text-sm">
              Đang tải dữ liệu truyện...
            </div>
          ) : error ? (
            <div className="text-red-500 py-20 text-center text-sm">{error}</div>
          ) : (
            <>
              {book && (
                <div className="relative flex flex-col items-end">
                  <div className="w-full">
                    <BookCard
                      data={book}
                      savedHistory={savedHistory}
                      onReadClick={() => {
                        if (savedHistory) {
                          handleSelect({
                            url: savedHistory.chapter_url,
                            title_vi: savedHistory.chapter_title,
                            slug: savedHistory.chapter_slug
                          } as any);
                        } else if (firstChapter) {
                          handleSelect(firstChapter);
                        }
                      }}
                      isSaved={isSaved}
                      onSaveClick={handleSaveToLibrary}
                    />
                  </div>
                  <div className="mt-2 md:mt-0 md:absolute md:top-4 md:right-4 z-10">
                    <button
                      onClick={handleSyncChapters}
                      disabled={isUpdating}
                      className={`text-[9px] md:text-[10px] border px-2 py-1 uppercase tracking-tighter transition-all ${
                        isUpdating ? "opacity-50 border-gray-500 text-gray-500" : "border-orange-500/50 text-orange-500/50 hover:opacity-100 hover:border-orange-500 hover:text-orange-500 bg-black/50"
                      }`}
                    >
                      {isUpdating ? "Syncing..." : "[ Update Chapters ]"}
                    </button>
                  </div>
                </div>
              )}

              {chapters.length > 0 && (
                <div className="w-full overflow-hidden">
                  <ChapterList chapters={chapters} onSelectChapter={handleSelect} />
                </div>
              )}
            </>
          )}
        </div>

        {/* BỎ: ReaderModal component ở đây */}
      </div>
    </main>
  );
}