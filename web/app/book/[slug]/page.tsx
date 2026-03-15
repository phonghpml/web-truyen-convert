"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/ui/BookCard";
import { ChapterList } from "@/components/ui/ChapterList";
import ReaderModal from "@/components/ui/ReaderModal";
import { LoadingState, ErrorState } from "@/components/shared/StateComponents";
import { fetchBook, fetchChapters } from "@/lib/hooks";
import { SelectedChapter, Book, Chapter } from "@/lib/types";
import { MESSAGES } from "@/lib/constants";

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [detailChapter, setDetailChapter] = useState<SelectedChapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Danh sách này sẽ luôn được sort từ nhỏ đến lớn để điều hướng không bị ngược
  const [readingList, setReadingList] = useState<Chapter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Hàm hỗ trợ lấy số chương để sắp xếp chuẩn
  const parseChapterNum = (title: string) => {
    const m = title.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[0]) : 0;
  };

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
            // LUÔN SORT DANH SÁCH GỐC TỪ NHỎ ĐẾN LỚN NGAY TỪ ĐẦU
            const sorted = [...chaptersData].sort((a, b) => 
                parseChapterNum(a.title_vi || "") - parseChapterNum(b.title_vi || "")
            );
            setChapters(sorted);
            setReadingList(sorted); // Reading list mặc định là từ thấp đến cao
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

  // Hàm xử lý khi chọn chương
  const handleSelectChapter = (chapter: any) => {
    // Tìm vị trí của chương này trong danh sách đã được sort tăng dần
    const index = readingList.findIndex(c => c.url === chapter.url);
    setCurrentIndex(index);
    setDetailChapter({ 
      title: chapter.title_vi || "Chương không tên", 
      url: chapter.url 
    });
  };

  const handleNext = () => {
    if (currentIndex < readingList.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextChapter = readingList[nextIdx];
      setCurrentIndex(nextIdx);
      setDetailChapter({ title: nextChapter.title_vi, url: nextChapter.url });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      const prevChapter = readingList[prevIdx];
      setCurrentIndex(prevIdx);
      setDetailChapter({ title: prevChapter.title_vi, url: prevChapter.url });
    }
  };

  if (loading) return <div className="bg-black min-h-screen p-10 text-orange-500">Đang tải...</div>;

  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
      <div className="max-w-5xl mx-auto">
        <Navbar session={null} onHomeClick={() => router.push("/")} />
        <div className="mt-12">
          <BookCard data={book} />
          {chapters.length > 0 && (
            <ChapterList
              chapters={chapters}
              // Chỉ cần truyền chapter được click, page.tsx tự xử lý vị trí
              onSelectChapter={(chapter) => handleSelectChapter(chapter)}
            />
          )}
        </div>

        <ReaderModal
          isOpen={!!detailChapter}
          onClose={() => setDetailChapter(null)}
          chapterTitle={detailChapter?.title || ""}
          chapterUrl={detailChapter?.url || ""}
          onNextChapter={handleNext}
          onPrevChapter={handlePrev}
        />
      </div>
    </main>
  );
}
