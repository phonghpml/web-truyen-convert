"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InputGroup } from "../ui/InputGroup";
import { BookCard } from "../ui/BookCard";
import { ChapterList } from "../ui/ChapterList";
import ReaderModal from "../ui/ReaderModal";
import { getCrawlerInfo, getCrawlerChapters } from "@/lib/hooks";
import { getSearchLink, isValidUrl } from "@/lib/utils";
import { SelectedChapter } from "@/lib/types";
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

  const [selectedChapter, setSelectedChapter] = useState<SelectedChapter | null>(null);

  // Gọi callback khi mode thay đổi
  useEffect(() => {
    const isSearching = mode !== "idle";
    onSearchMode?.(isSearching);
  }, [mode, onSearchMode]);

  const handleSearch = async () => {
    if (!input.trim()) return;
    
    // Navigate to search page với query
    router.push(getSearchLink(input));
  };

  const handleConvert = async () => {
    if (!input) return;
    setLoading(true);
    setChapters([]);
    setData(null);
    setMode("idle");

    try {
      // 1. Lấy thông tin cơ bản
      const infoResult = await getCrawlerInfo(input);
      if (infoResult.success) setData(infoResult.data);

      // 2. Lấy danh sách chương
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
      // Nếu là URL → convert
      await handleConvert();
    } else {
      // Nếu không phải URL → tìm kiếm
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

      {/* MODE CONVERT: Hiển thị Card + Danh sách chương */}
      {mode === "convert" && data && (
        <>
          <BookCard data={data} />
          {chapters.length > 0 && (
            <ChapterList
              chapters={chapters}
              onSelectChapter={(title, url) =>
                setSelectedChapter({ title, url })
              }
            />
          )}
        </>
      )}

      {/* Modal hiển thị nội dung chương */}
      <ReaderModal
        isOpen={!!selectedChapter}
        onClose={() => setSelectedChapter(null)}
        chapterTitle={selectedChapter?.title || ""}
        chapterUrl={selectedChapter?.url || ""}
      />
    </div>
  );
}
