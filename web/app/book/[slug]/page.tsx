"use client";

import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/ui/BookCard";
import { ChapterList } from "@/components/ui/ChapterList";
import ReaderModal from "@/components/ui/ReaderModal";
import { MESSAGES } from "@/lib/constants";
import { fetchBook, fetchChapters } from "@/lib/hooks";
import { useReader } from "@/lib/hooks/useReader"; // Import hook dùng chung
import { Book, Chapter } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";


export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedHistory, setSavedHistory] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  // --- SỬ DỤNG CUSTOM HOOK TỐI ƯU ---
  const {
    detailChapter,
    handleSelect,
    handleNext,
    handlePrev,
    close
  } = useReader(chapters, book?.source_url || ""); // Truyền source_url để hook có thể cập nhật lịch sử

  const { data: session } = useSession();
  useEffect(() => {
    const fetchBookData = async () => {
      try {
        setLoading(true);
        const { book: bookData, error: bookError } = await fetchBook(slug);

        if (bookError || !bookData) {
          setError(bookError || MESSAGES.NO_BOOK_FOUND);
          return;
        }
        setBook(bookData);

        if (bookData.source_url) {
          const { chapters: chaptersData, error: chaptersError } = await fetchChapters(bookData.source_url);
          if (!chaptersError) {
            setChapters(chaptersData);
          }
        }
        setError(null);
      } catch (err) {
        setError(MESSAGES.ERROR_BOOK_DETAILS);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchBookData();
  }, [slug]);

  useEffect(() => {
    const getHistory = async () => {
      if (book?.source_url) {
        const res = await fetch(`/api/user/history?book_url=${encodeURIComponent(book.source_url)}`);
        const result = await res.json();
        console.log("Lịch sử đọc truyện:", result);
        if (result.success && result.data) {
          setSavedHistory(result.data);
        }
      }
    };
    getHistory();
  }, [book]);

  useEffect(() => {
    if (book?.source_url && session) {
      fetch(`/api/user/library?book_url=${encodeURIComponent(book.source_url)}`)
        .then(res => res.json())
        .then(data => setIsSaved(data.isSaved));
    }
  }, [book, session]);

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

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-orange-500 font-mono">
      Đang tải dữ liệu truyện...
    </div>
  );

  if (error) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-red-500 font-mono">
      {error}
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
       <Suspense fallback={null}>
      <div className="max-w-5xl mx-auto">
        <Navbar session={session} onHomeClick={() => router.push("/")} />

        <div className="mt-12 space-y-8">
          {book &&
            <BookCard data={book} savedHistory={savedHistory}
              onReadClick={() => {
                if (savedHistory) {
                  // Nếu có lịch sử -> Đọc tiếp chương cũ
                  handleSelect({
                    url: savedHistory.chapter_url,
                    title_vi: savedHistory.chapter_title
                  });
                } else if (chapters.length > 0) {
                  // Nếu chưa có -> Tìm chương 1 (sort tăng dần rồi lấy cái đầu)
                  const sorted = [...chapters].sort((a, b) =>
                    (a.title_vi.match(/\d+/) || 0) - (b.title_vi.match(/\d+/) || 0)
                  );
                  handleSelect(sorted[0]);
                }
              }}
              isSaved={isSaved}
              onSaveClick={handleSaveToLibrary}
            />
          }

          {chapters.length > 0 && (
            <ChapterList
              chapters={chapters}
              onSelectChapter={handleSelect} // Dùng hàm từ hook
            />
          )}
        </div>

        {/* Modal đọc truyện với logic điều hướng từ hook */}
        {detailChapter && (
          <ReaderModal
            isOpen={!!detailChapter}
            onClose={close}
            chapterTitle={detailChapter.title || "Chương không tên"}
            chapterUrl={detailChapter.url}
            onNextChapter={handleNext}
            onPrevChapter={handlePrev}
          />
        )}
      </div>
      </Suspense>
    </main>
  );
}
