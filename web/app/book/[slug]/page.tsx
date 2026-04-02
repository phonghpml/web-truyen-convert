"use client";

import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/ui/BookCard";
import { ChapterList } from "@/components/ui/ChapterList";
import ReaderModal from "@/components/ui/ReaderModal";
import { MESSAGES } from "@/lib/constants";
import { fetchBook, fetchChapters } from "@/lib/hooks";
import { useReader } from "@/lib/hooks/useReader";
import { Book, Chapter } from "@/lib/types";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session } = useSession();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedHistory, setSavedHistory] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  const { detailChapter, handleSelect, handleNext, handlePrev, close } = useReader(
    chapters,
    book?.source_url || ""
  );

  // 1. Tối ưu Fetching: Gom nhóm để tránh giật lag UI
  useEffect(() => {
    if (!slug) return;
    const loadAllData = async () => {
      try {
        setLoading(true);
        const { book: bookData, error: bookError } = await fetchBook(slug);

        if (bookError || !bookData) {
          setError(bookError || MESSAGES.NO_BOOK_FOUND);
          return;
        }

        setBook(bookData);

        // Fetch đồng thời cả Chapters, History và Library status nếu đã có book data
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
    };

    loadAllData();
  }, [slug, session]); // Chỉ chạy lại khi slug hoặc session thay đổi

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

  // Tối ưu: Dùng useMemo để tránh tính toán lại logic tìm chương 1 khi render
  const firstChapter = useMemo(() => {
    if (chapters.length === 0) return null;
    return [...chapters].sort((a, b) =>
      (a.title_vi.match(/\d+/) || 0) - (b.title_vi.match(/\d+/) || 0)
    )[0];
  }, [chapters]);

  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
      <div className="max-w-5xl mx-auto">
        {/* Navbar luôn hiển thị, không bị biến mất khi loading */}
        <Navbar session={session} onHomeClick={() => router.push("/")} />

        <div className="mt-12 space-y-8">
          {loading ? (
            // Thay vì return trắng trang, ta hiện loading tại đúng vị trí nội dung
            <div className="flex flex-col items-center py-20 text-orange-500 animate-pulse">
              Đang tải dữ liệu truyện...
            </div>
          ) : error ? (
            <div className="text-red-500 py-20 text-center">{error}</div>
          ) : (
            <>
              {book && (
                <BookCard
                  data={book}
                  savedHistory={savedHistory}
                  onReadClick={() => {
                    if (savedHistory) {
                      handleSelect(
                        {
                          url: savedHistory.chapter_url,
                          title_vi: savedHistory.chapter_title,
                          slug: savedHistory.chapter_slug
                        });
                    } else if (firstChapter) {
                      handleSelect(firstChapter);
                    }
                  }}
                  isSaved={isSaved}
                  onSaveClick={handleSaveToLibrary}
                />
              )}

              {chapters.length > 0 && (
                <ChapterList chapters={chapters} onSelectChapter={handleSelect} />
              )}
            </>
          )}
        </div>

        {detailChapter && (
          <ReaderModal
            isOpen={!!detailChapter}
            onClose={close}
            chapterTitle={detailChapter.title || "Chương không tên"}
            chapterSlug={detailChapter.slug}
            onNextChapter={handleNext}
            onPrevChapter={handlePrev}
            chapterUrl={detailChapter.url}
          />
        )}
      </div>
    </main>
  );
}
