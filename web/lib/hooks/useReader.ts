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
  const [detailChapter, setDetailChapter] = useState<{ title: string; slug: string, url: string; } | null>(null);

  // 1. Tự động sắp xếp và kiểm tra Deep Link
  useEffect(() => {
    if (chapters.length > 0) {
      const sorted = [...chapters].sort((a, b) =>
        parseChapterNum(a.title_vi || "") - parseChapterNum(b.title_vi || "")
      );
      setReadingList(sorted);

      const chSlug = searchParams.get("ch");
      if (chSlug) {
        const idx = sorted.findIndex(c => c.slug === chSlug);
        if (idx !== -1) {
          setCurrentIndex(idx);
          setDetailChapter({ title: sorted[idx].title_vi, slug: sorted[idx].slug, url: sorted[idx].url });
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
              chapter_slug: detailChapter.slug,
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

  const updateUrl = useCallback((slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("ch", slug); else params.delete("ch");
    const query = params.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSelect = (chapter: any) => {
    const idx = readingList.findIndex(c => c.slug === chapter.slug);
    setCurrentIndex(idx);
    setDetailChapter({ title: chapter.title_vi, slug: chapter.slug, url: chapter.url });
    updateUrl(chapter.slug);
  };

  const handleNext = () => {
    if (currentIndex < readingList.length - 1) {
      const next = readingList[currentIndex + 1];
      setCurrentIndex(prev => prev + 1);
      setDetailChapter({ title: next.title_vi, slug: next.slug, url: next.url });
      updateUrl(next.slug);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prev = readingList[currentIndex - 1];
      setCurrentIndex(prev => prev - 1);
      setDetailChapter({ title: prev.title_vi, slug: prev.slug, url: prev.url });
      updateUrl(prev.slug);
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
