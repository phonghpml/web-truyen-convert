"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // Thêm để check login
import { InputGroup } from "../ui/InputGroup";
import { BookCard } from "../ui/BookCard";
import { ChapterList } from "../ui/ChapterList";
import ReaderModal from "../ui/ReaderModal";
import { getCrawlerInfo, getCrawlerChapters } from "@/lib/hooks";
import { getSearchLink, isValidUrl } from "@/lib/utils";
import { MESSAGES } from "@/lib/constants";
import { useReader } from "@/lib/hooks/useReader";

interface CrawlSectionProps {
  onSearchMode?: (isSearching: boolean) => void;
}

export default function CrawlSection({ onSearchMode }: CrawlSectionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [input, setInput] = useState("");
  const [data, setData] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"idle" | "convert">("idle");
  
  // State bổ sung để đồng bộ với BookCard
  const [savedHistory, setSavedHistory] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  // --- SỬ DỤNG CUSTOM HOOK ---
  // Truyền input (source_url) vào hook để nó tự lưu lịch sử khi bạn đọc ở bản Convert
  const { 
    detailChapter, 
    handleSelect, 
    handleNext, 
    handlePrev, 
    close 
  } = useReader(chapters, mode === "convert" ? input : undefined);

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
    setSavedHistory(null);

    try {
      // 1. Cào thông tin cơ bản từ Crawler
      const infoResult = await getCrawlerInfo(input);
      if (!infoResult.success) throw new Error("Crawl failed");
      
      const bookData = infoResult.data;
      setData(bookData);

      // 2. ĐỒNG BỘ VÀO DATABASE (Update if exists)
      // Bạn cần tạo API /api/books/sync xử lý logic này
      await fetch("/api/books/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: input,
          title_vi: bookData.title_vi,
          cover_url: bookData.cover_url,
          description_vi: bookData.description_vi,
          author_vi: bookData.author_vi
        })
      });

      // 3. KIỂM TRA LỊCH SỬ & TỦ SÁCH (Nếu đã đăng nhập)
      if (session) {
        const [histRes, libRes] = await Promise.all([
          fetch(`/api/user/history?book_url=${encodeURIComponent(input)}`),
          fetch(`/api/user/library?book_url=${encodeURIComponent(input)}`)
        ]);
        const histJson = await histRes.json();
        const libJson = await libRes.json();
        
        if (histJson.success) setSavedHistory(histJson.data);
        setIsSaved(libJson.isSaved);
      }

      // 4. Lấy danh sách chương
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

  // Hàm xử lý lưu tủ sách ngay tại bản Convert
  const handleSaveToggle = async () => {
    if (!session) return alert("Vui lòng đăng nhập!");
    const res = await fetch("/api/user/library", {
      method: "POST",
      body: JSON.stringify({
        book_url: input,
        title_vi: data?.title_vi,
        cover_url: data?.cover_url
      })
    });
    const result = await res.json();
    setIsSaved(result.isSaved);
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
          {/* BookCard giờ đây đã có đủ logic như trang chi tiết */}
          <BookCard 
            data={data} 
            savedHistory={savedHistory}
            isSaved={isSaved}
            onSaveClick={handleSaveToggle}
            onReadClick={() => {
              if (savedHistory) {
                handleSelect({ url: savedHistory.chapter_url, title_vi: savedHistory.chapter_title });
              } else {
                handleSelect(chapters[0]); // Đọc chương đầu
              }
            }}
          />
          {chapters.length > 0 && (
            <ChapterList
              chapters={chapters}
              onSelectChapter={handleSelect}
            />
          )}
        </>
      )}

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
