"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InputGroup } from "../ui/InputGroup";
import { BookCard } from "../ui/BookCard";
import { ChapterList } from "../ui/ChapterList";
import ReaderModal from "../ui/ReaderModal";
import { getCrawlerInfo, getCrawlerChapters } from "@/lib/hooks";
import { getSearchLink, isValidUrl } from "@/lib/utils";
import { MESSAGES } from "@/lib/constants";

interface CrawlSectionProps {
  onSearchMode?: (isSearching: boolean) => void;
}

export default function CrawlSection({ onSearchMode }: CrawlSectionProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [data, setData] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"idle" | "convert">("idle");

  // --- LOGIC ĐỌC TRUYỆN TỐI ƯU ---
  const [readingList, setReadingList] = useState<any[]>([]); // Luôn sort 1 -> 100
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper để trích xuất số chương giúp sort chuẩn
  const parseChapterNum = (title: string) => {
    const m = title.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[0]) : 0;
  };

  useEffect(() => {
    const isSearching = mode !== "idle";
    onSearchMode?.(isSearching);
  }, [mode, onSearchMode]);

  const handleSearch = async () => {
    if (!input.trim()) return;
    router.push(getSearchLink(input));
  };

  const handleConvert = async () => {
    if (!input) return;
    setLoading(true);
    setChapters([]);
    setData(null);
    setMode("idle");

    try {
      const infoResult = await getCrawlerInfo(input);
      if (infoResult.success) setData(infoResult.data);

      const chapterResult = await getCrawlerChapters(input);
      if (chapterResult.success) {
        // LUÔN TẠO MỘT BẢN SORT TĂNG DẦN ĐỂ ĐIỀU HƯỚNG KHÔNG BỊ NGƯỢC
        const sortedAsc = [...chapterResult.chapters].sort((a, b) => 
          parseChapterNum(a.title_vi || "") - parseChapterNum(b.title_vi || "")
        );
        setChapters(chapterResult.chapters); // Danh sách hiện ra màn hình
        setReadingList(sortedAsc);          // Danh sách dùng để chuyển chương (1, 2, 3...)
        setMode("convert");
      }
    } catch (err) {
      console.error("Convert error:", err);
      alert(MESSAGES.ERROR_CONVERT);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!input) return;
    if (isValidUrl(input)) {
      await handleConvert();
    } else {
      await handleSearch();
    }
  };

  // HÀM XỬ LÝ KHI CHỌN CHƯƠNG
  const handleSelectChapter = (chapter: any) => {
    // Tìm vị trí chính xác của chương này trong ReadingList (1 -> 100)
    const idx = readingList.findIndex(c => c.url === chapter.url);
    setCurrentIndex(idx);
    setIsModalOpen(true);
  };

  const handleNext = () => {
    if (currentIndex < readingList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8 py-10">
      <InputGroup
        url={input}
        setUrl={setInput}
        onCrawl={handleExecute}
        loading={loading}
      />

      {mode === "convert" && data && (
        <>
          <BookCard data={data} />
          {chapters.length > 0 && (
            <ChapterList
              chapters={chapters}
              // Đổi lại: chỉ truyền chapter được chọn
              onSelectChapter={(chapter) => handleSelectChapter(chapter)}
            />
          )}
        </>
      )}

      {isModalOpen && currentIndex !== -1 && (
        <ReaderModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentIndex(-1);
          }}
          // Dữ liệu lấy từ readingList để đảm bảo tiêu đề và URL khớp với thứ tự tiến
          chapterTitle={readingList[currentIndex]?.title_vi || ""}
          chapterUrl={readingList[currentIndex]?.url || ""}
          onNextChapter={handleNext}
          onPrevChapter={handlePrev}
        />
      )}
    </div>
  );
}
