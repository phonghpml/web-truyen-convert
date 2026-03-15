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
import { useReader } from "@/lib/hooks/useReader"; // Import hook đã tạo

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

  // --- SỬ DỤNG CUSTOM HOOK TỐI ƯU ---
  const { 
    detailChapter, 
    handleSelect, 
    handleNext, 
    handlePrev, 
    close 
  } = useReader(chapters);

  useEffect(() => {
    onSearchMode?.(mode !== "idle");
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
        setChapters(chapterResult.chapters);
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
              onSelectChapter={handleSelect} // Dùng hàm từ hook
            />
          )}
        </>
      )}

      {/* Chỉ render Modal khi thực sự có chương được chọn */}
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
  );
}
