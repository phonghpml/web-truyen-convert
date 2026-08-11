"use client";

import { Navbar } from "@/components/layout/Navbar";
import { BookCard } from "@/components/ui/BookCard";
import { ChapterList } from "@/components/ui/ChapterList";
// BỎ: import ReaderModal from "@/components/ui/ReaderModal"; 
import { MESSAGES } from "@/lib/constants";
import { fetchBook, fetchChapters, fetchBookVideos } from "@/lib/hooks";
import { CRAWLER_BASE_URL } from "@/lib/constants";
import { ApiResponse, Book, Chapter, LibraryStatusResponse, ReadingHistory, Video } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/lib/useAuth";
import { getReadingHistory, getLibraryStatus, toggleLibrary } from "@/lib/auth";

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuth();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHistory, setSavedHistory] = useState<ReadingHistory | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<"chapters" | "videos">("chapters");

  // THAY THẾ: Logic handleSelect mới để chuyển hướng thay vì mở Modal
  const handleSelect = useCallback((chapter: Chapter) => {
    if (!chapter.url) return;

    // 1. Lưu danh sách chương vào localStorage để trang [chapter_slug] dùng tính Next/Prev
    localStorage.setItem(`chapters_${slug}`, JSON.stringify(chapters));

    // 2. Chuyển hướng kèm theo URL gốc ở query để Backend cào dữ liệu
    const encodedUrl = encodeURIComponent(chapter.url);
    router.push(`/book/${slug}/${chapter.slug}?url=${encodedUrl}`);
  }, [chapters, slug, router]);

  const loadAllData = useCallback(async (showGlobalLoading = true) => {
    if (!slug) return;
    try {
      if (showGlobalLoading) setLoading(true);
      const { book: bookData, error: bookError } = await fetchBook(slug);

      if (bookError || !bookData) {
        setError(bookError || MESSAGES.NO_BOOK_FOUND);
        return;
      }

      setBook(bookData);

      const chapterPromise: Promise<{ chapters: Chapter[]; error: string | null }> =
        bookData.source_url
          ? fetchChapters(bookData.source_url)
          : Promise.resolve({ chapters: [], error: null });

      const historyPromise =
        bookData.source_url && user
          ? getReadingHistory(bookData.source_url)
          : Promise.resolve({ success: false } as ApiResponse<ReadingHistory>);

      const libraryPromise =
        bookData.source_url && user
          ? getLibraryStatus(bookData.source_url)
          : Promise.resolve({ success: false, isSaved: false } as LibraryStatusResponse);

      const videoPromise:
        | Promise<{ videos: Video[]; error: string | null }>
        | Promise<{ videos: Video[]; error: string | null }> =
        bookData.source_url
          ? fetchBookVideos(bookData.source_url)
          : Promise.resolve({ videos: [], error: null });

      const [chaptersRes, historyRes, libraryRes, videosRes] = await Promise.all([
        chapterPromise,
        historyPromise,
        libraryPromise,
        videoPromise,
      ]);

      if (chaptersRes.chapters) setChapters(chaptersRes.chapters);
      if (historyRes?.success) setSavedHistory(historyRes.data ?? null);
      if (libraryRes?.success) setIsSaved(!!libraryRes.data?.isSaved);
      if (videosRes?.videos) setVideos(videosRes.videos);

    } catch {
      setError(MESSAGES.ERROR_BOOK_DETAILS);
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSyncChapters = async () => {
    if (!book?.source_url) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`${CRAWLER_BASE_URL}/get-chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: book.source_url })
      });
      const data = await response.json();
      if (data.success) await loadAllData(false);
    } catch {
      alert("Lỗi khi kết nối với máy chủ cập nhật.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    const data = await toggleLibrary({
      book_url: book?.source_url || "",
      title_vi: book?.title_vi || "",
      cover_url: book?.cover_url,
    });

    if (data.success) {
      setIsSaved(!!data.isSaved);
    } else {
      alert(data.error || "Không thể cập nhật tủ sách");
    }
  };

  const firstChapter = useMemo(() => {
    if (chapters.length === 0) return null;

    const parseChapterNumber = (chapter: Chapter) => {
      if (typeof chapter.chapter_no === "number") {
        return chapter.chapter_no;
      }
      const title = chapter.title_vi || chapter.title || "";
      const match = title.match(/\d+(?:\.\d+)?/);
      return match ? parseFloat(match[0]) : Number.POSITIVE_INFINITY;
    };

    return [...chapters].sort((a, b) => parseChapterNumber(a) - parseChapterNumber(b))[0];
  }, [chapters]);

  return (
    <main className="min-h-screen bg-black text-white font-mono p-4 md:p-6">
      <div className="max-w-5xl mx-auto w-full">
        <Navbar onHomeClick={() => router.push("/")} />

        <div className="mt-8 md:mt-12 space-y-6 md:space-y-8">
          {loading ? (
            <div className="flex flex-col items-center py-20 text-orange-500 animate-pulse text-sm">
              Đang tải dữ liệu truyện...
            </div>
          ) : error ? (
            <div className="text-red-500 py-20 text-center text-sm">{error}</div>
          ) : (
            <>
              {book && (
                <div className="relative flex flex-col items-end">
                  <div className="w-full">
                    <BookCard
                      data={book}
                      savedHistory={savedHistory}
                      onReadClick={() => {
                        if (savedHistory) {
                          handleSelect({
                            url: savedHistory.chapter_url || "",
                            title_vi: savedHistory.chapter_title,
                            slug: savedHistory.chapter_slug,
                            title: savedHistory.chapter_title,
                            chapter_no: 0,
                            book_source_url: book?.source_url || "",
                          } as Chapter);
                        } else if (firstChapter) {
                          handleSelect(firstChapter);
                        }
                      }}
                      isSaved={isSaved}
                      onSaveClick={handleSaveToLibrary}
                    />
                  </div>
                  <div className="mt-2 md:mt-0 md:absolute md:top-4 md:right-4 z-10">
                    <button
                      onClick={handleSyncChapters}
                      disabled={isUpdating}
                      className={`text-[9px] md:text-[10px] border px-2 py-1 uppercase tracking-tighter transition-all ${isUpdating ? "opacity-50 border-gray-500 text-gray-500" : "border-orange-500/50 text-orange-500/50 hover:opacity-100 hover:border-orange-500 hover:text-orange-500 bg-black/50"
                        }`}
                    >
                      {isUpdating ? "Syncing..." : "[ Update Chapters ]"}
                    </button>
                  </div>
                </div>
              )}

              <div className="w-full overflow-hidden">
                <div className="mb-6 flex gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 p-1 text-xs uppercase tracking-[0.25em] text-zinc-400">
                  <button
                    type="button"
                    onClick={() => setActiveTab("chapters")}
                    className={`rounded-full px-4 py-2 transition-all ${activeTab === "chapters"
                        ? "bg-orange-500 text-black"
                        : "hover:bg-white/5 hover:text-white"
                      }`}
                  >
                    Chương
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("videos")}
                    className={`rounded-full px-4 py-2 transition-all ${activeTab === "videos"
                        ? "bg-orange-500 text-black"
                        : "hover:bg-white/5 hover:text-white"
                      }`}
                  >
                    Video đã tạo
                  </button>
                </div>

                {activeTab === "chapters" ? (
                  chapters.length > 0 ? (
                    <ChapterList chapters={chapters} onSelectChapter={handleSelect} />
                  ) : (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-300">
                      Không tìm thấy chương.
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {videos.length === 0 ? (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-300">
                        Chưa có video nào được tạo cho truyện này.
                      </div>
                    ) : (
                      videos.map((video) => (
                        <div key={video.id ?? video.video_url} className="rounded-3xl border border-zinc-800 bg-zinc-950/90 p-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Video chương</p>
                              <p className="mt-1 text-base font-semibold text-white">
                                <div className="mt-4 space-y-2">
                                  {video.video_title ? (
                                    <p className="text-lg font-semibold text-white">{video.video_title}</p>
                                  ) : (
                                    <p className="text-lg font-semibold text-white">{video.book_title || "Video"}</p>
                                  )}
                                  {video.author_name ? (
                                    <p className="text-sm text-zinc-400">Tác giả: {video.author_name}</p>
                                  ) : null}
                                  {video.video_description ? (
                                    <p className="text-sm text-zinc-300">{video.video_description}</p>
                                  ) : null}
                                  {video.video_tags ? (
                                    <div className="flex flex-wrap gap-2">
                                      {video.video_tags.split(",").map((tag) => (
                                        <span key={tag.trim()} className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
                                          {tag.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </p>
                            </div>
                            <div className="text-right text-sm text-zinc-400">
                              <p>Giọng: {video.voice}</p>
                              <p>Rate: {video.rate}</p>
                            </div>
                          </div>

                          <a
                            href={video.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-400 underline"
                          >
                            Xem video
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* BỎ: ReaderModal component ở đây */}
      </div>
    </main>
  );
}