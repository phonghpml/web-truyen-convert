import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { parseChapterNum } from "@/lib/utils";

// Thêm bookUrl vào tham số đầu vào của Hook
export function useReader(chapters: any[], bookUrl?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [readingList, setReadingList] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [detailChapter, setDetailChapter] = useState<{ title: string; url: string } | null>(null);

  // 1. Tự động sắp xếp và kiểm tra Deep Link
  useEffect(() => {
    if (chapters.length > 0) {
      const sorted = [...chapters].sort((a, b) => 
        parseChapterNum(a.title_vi || "") - parseChapterNum(b.title_vi || "")
      );
      setReadingList(sorted);

      const chUrl = searchParams.get("ch");
      if (chUrl) {
        const idx = sorted.findIndex(c => c.url === chUrl);
        if (idx !== -1) {
          setCurrentIndex(idx);
          setDetailChapter({ title: sorted[idx].title_vi, url: sorted[idx].url });
        }
      }
    }
  }, [chapters, searchParams]);

  // 2. Logic TỰ ĐỘNG LƯU LỊCH SỬ (Mới thêm)
  useEffect(() => {
    // Chỉ lưu nếu đang mở một chương và có thông tin bộ truyện
    if (detailChapter && bookUrl) {
      const saveHistory = async () => {
        try {
          await fetch("/api/user/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              book_url: bookUrl,
              chapter_url: detailChapter.url,
              chapter_title: detailChapter.title,
            }),
          });
        } catch (err) {
          console.error("Không thể lưu lịch sử đọc dở");
        }
      };

      // Đợi 2 giây sau khi người dùng dừng thao tác mới gửi API (Debounce)
      const timer = setTimeout(saveHistory, 2000);
      return () => clearTimeout(timer);
    }
  }, [detailChapter, bookUrl]);

  const updateUrl = useCallback((url: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (url) params.set("ch", url); else params.delete("ch");
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSelect = (chapter: any) => {
    const idx = readingList.findIndex(c => c.url === chapter.url);
    setCurrentIndex(idx);
    setDetailChapter({ title: chapter.title_vi, url: chapter.url });
    updateUrl(chapter.url);
  };

  const handleNext = () => {
    if (currentIndex < readingList.length - 1) {
      const next = readingList[currentIndex + 1];
      setCurrentIndex(prev => prev + 1);
      setDetailChapter({ title: next.title_vi, url: next.url });
      updateUrl(next.url);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prev = readingList[currentIndex - 1];
      setCurrentIndex(prev => prev - 1);
      setDetailChapter({ title: prev.title_vi, url: prev.url });
      updateUrl(prev.url);
    }
  };

  return {
    detailChapter,
    readingList,
    handleSelect,
    handleNext,
    handlePrev,
    close: () => { setDetailChapter(null); updateUrl(null); }
  };
}
