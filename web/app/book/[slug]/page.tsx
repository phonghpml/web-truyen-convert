"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/ui/BookCard";
import { ChapterList } from "@/components/ui/ChapterList";
import ReaderModal from "@/components/ui/ReaderModal";
import {
  LoadingState,
  ErrorState,
} from "@/components/shared/StateComponents";
import { fetchBook, fetchChapters } from "@/lib/hooks";
import { decodeBookId } from "@/lib/utils";
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

  useEffect(() => {
    const fetchBookData = async () => {
      try {
        setLoading(true);
        const decodedSlug = decodeBookId(slug);

        const { book: bookData, error: bookError } = await fetchBook(slug);

        if (bookError || !bookData) {
          setError(bookError || MESSAGES.NO_BOOK_FOUND);
          setBook(null);
          setChapters([]);
          return;
        }

        setBook(bookData);

        // Fetch chapters
        if (bookData.source_url) {
          const { chapters: chaptersData, error: chaptersError } =
            await fetchChapters(bookData.source_url);

          if (!chaptersError) {
            setChapters(chaptersData);
          }
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching book details:", err);
        setError(MESSAGES.ERROR_BOOK_DETAILS);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchBookData();
    }
  }, [slug]);

  const handleBack = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white font-mono p-6">
        <div className="max-w-5xl mx-auto">
          <Navbar session={null} onHomeClick={handleBack} />
          <LoadingState message={MESSAGES.LOADING} />
        </div>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="min-h-screen bg-black text-white font-mono p-6">
        <div className="max-w-5xl mx-auto">
          <Navbar session={null} onHomeClick={handleBack} />
          <ErrorState message={error || MESSAGES.NO_BOOK_FOUND} onHome={handleBack} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
      <div className="max-w-5xl mx-auto">
        <Navbar session={null} onHomeClick={handleBack} />

        <div className="mt-12">
          <h3 className="text-2xl font-bold text-white mb-4">Thông tin truyện</h3>
          <BookCard data={book} />

          {chapters.length > 0 && (
            <ChapterList
              chapters={chapters}
              onSelectChapter={(title, url) =>
                setDetailChapter({ title, url })
              }
            />
          )}

          <button
            onClick={handleBack}
            className="mt-6 text-[10px] text-orange-500 uppercase font-bold hover:text-orange-400 transition-colors"
          >
            ← Quay lại danh sách
          </button>
        </div>

        {/* reader modal for details */}
        <ReaderModal
          isOpen={!!detailChapter}
          onClose={() => setDetailChapter(null)}
          chapterTitle={detailChapter?.title || ""}
          chapterUrl={detailChapter?.url || ""}
        />
      </div>
    </main>
  );
}
