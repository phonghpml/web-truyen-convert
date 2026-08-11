import { useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Chapter } from "@/lib/types";
import { parseChapterNum } from "@/lib/utils";
import { saveReadingHistory } from "@/lib/auth";

// Thêm bookUrl vào tham số đầu vào của Hook
export function useReader(chapters: Chapter[], bookUrl?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const readingList = useMemo(
    () => [...chapters].sort((a, b) =>
      parseChapterNum(a.title_vi || "") - parseChapterNum(b.title_vi || "")
    ),
    [chapters]
  );

  const chapterSlug = searchParams.get("ch") ?? "";

  const currentIndex = useMemo(
    () => readingList.findIndex((c) => c.slug === chapterSlug),
    [readingList, chapterSlug]
  );

  const detailChapter = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= readingList.length) {
      return null;
    }
    const chapter = readingList[currentIndex];
    return {
      title: chapter.title_vi || chapter.title || "",
      slug: chapter.slug,
      url: chapter.url,
    };
  }, [currentIndex, readingList]);

  useEffect(() => {
    if (!detailChapter || !bookUrl) return;

    const saveHistory = async () => {
      try {
        await saveReadingHistory({
          book_url: bookUrl,
          chapter_slug: detailChapter.slug,
          chapter_url: detailChapter.url,
          chapter_title: detailChapter.title,
        });
      } catch (error) {
        console.error("Không thể lưu lịch sử đọc dở", error);
      }
    };

    const timer = window.setTimeout(saveHistory, 2000);
    return () => window.clearTimeout(timer);
  }, [detailChapter, bookUrl]);

  const updateUrl = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug) params.set("ch", slug);
      else params.delete("ch");
      const query = params.toString();
      router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleSelect = useCallback(
    (chapter: Chapter) => {
      if (chapter.slug) {
        updateUrl(chapter.slug);
      }
    },
    [updateUrl]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < readingList.length - 1) {
      const nextChapter = readingList[currentIndex + 1];
      if (nextChapter) {
        updateUrl(nextChapter.slug);
      }
    }
  }, [currentIndex, readingList, updateUrl]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      const prevChapter = readingList[currentIndex - 1];
      if (prevChapter) {
        updateUrl(prevChapter.slug);
      }
    }
  }, [currentIndex, readingList, updateUrl]);

  return {
    detailChapter,
    readingList,
    handleSelect,
    handleNext,
    handlePrev,
    close: () => updateUrl(null),
  };
}
