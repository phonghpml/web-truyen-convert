"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Settings, Loader2, Headphones,
  Square, Play, SkipForward, SkipBack, Gauge, User, X
} from "lucide-react";
import { CRAWLER_BASE_URL } from "@/lib/constants";
import { authFetch } from "@/lib/auth";
import { Chapter } from "@/lib/types";
import { Navbar } from "@/components/layout/Navbar";

const NGHITTS_VOICE = "nghitts:ngochuyennew";

function getSpeedBounds(voice: string) {
  return voice === NGHITTS_VOICE ? { min: -67, max: 100 } : { min: -50, max: 100 };
}

function getBackendRate(speed: string, voice: string) {
  if (voice !== NGHITTS_VOICE) return speed;

  const speedPercent = Number.parseFloat(speed);
  const speedMultiplier = 1 + speedPercent / 100;
  const ratePercent = (1 / speedMultiplier - 1) * 100;
  return `${ratePercent > 0 ? "+" : ""}${ratePercent.toFixed(2)}%`;
}

let contentAbortController: AbortController | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;

function getSharedAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioElement) sharedAudioElement = new Audio();
  return sharedAudioElement;
}

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const chapterSlug = params.chapter_slug as string;
  const chapterUrl = searchParams.get("url");

  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentSource, setContentSource] = useState<"db" | "crawler">("crawler");
  const [fontSize, setFontSize] = useState(18);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [speed, setSpeed] = useState("+0%");
  const [voice, setVoice] = useState("vi-VN-NamMinhNeural");
  const [draftSpeed, setDraftSpeed] = useState("+0%");
  const [draftVoice, setDraftVoice] = useState("vi-VN-NamMinhNeural");
  const [activeMenu, setActiveMenu] = useState<"none" | "audio" | "style">("none");
  const [displayedChapterTitle, setDisplayedChapterTitle] = useState<string>("");
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobCache = useRef<{ [key: number]: string }>({});
  const loadingTasks = useRef<Map<number, { promise: Promise<void>; controller: AbortController }>>(new Map());
  const audioCacheVersion = useRef(0);
  const playbackSession = useRef(0);
  const speedRef = useRef(speed);
  const voiceRef = useRef(voice);
  const playingBlobUrl = useRef<string | null>(null);
  const playParagraphRef = useRef<(index: number) => Promise<boolean>>(async () => false);
  const loadedChapterUrl = useRef<string | null>(null);
  const autoPlayHandled = useRef(false);
  const autoPlayRequested = searchParams.get("autoplay") === "1";

  useEffect(() => {
    audioRef.current = getSharedAudioElement();
    return () => {
      stopAudio();
      clearBlobCache();
      if (contentAbortController) contentAbortController.abort();
    };
  }, []);

  useEffect(() => {
    if (activeMenu !== "style") return;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveMenu("none");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeMenu]);

  const clearBlobCache = (preservePlayingAudio = false) => {
    audioCacheVersion.current += 1;
    loadingTasks.current.forEach(({ controller }) => controller.abort());
    Object.values(blobCache.current).forEach(url => {
      if (!preservePlayingAudio || url !== playingBlobUrl.current) {
        URL.revokeObjectURL(url);
      }
    });
    blobCache.current = {};
    loadingTasks.current.clear();
  };

  const syncChapterTitle = useCallback((chapterList: Chapter[] | null | undefined) => {
    if (!chapterList?.length || !chapterSlug) return;

    const normalizedChapterSlug = decodeURIComponent(chapterSlug);
    const found = chapterList.find((c: Chapter) =>
      c.slug === chapterSlug ||
      c.slug === normalizedChapterSlug ||
      c.slug === decodeURIComponent(normalizedChapterSlug)
    );

    let title = "";
    if (found) {
      if (typeof found.title_vi === "string" && found.title_vi.trim()) {
        title = found.title_vi;
      } else if (typeof found.title === "string" && found.title.trim()) {
        title = found.title;
      }
    }

    if (title) {
      setDisplayedChapterTitle(title);
    }
  }, [chapterSlug]);

  const fetchContent = useCallback(async (targetUrl: string) => {
    if (contentAbortController) contentAbortController.abort();
    contentAbortController = new AbortController();
    setLoading(true);
    clearBlobCache();
    try {
      const res = await authFetch(`${CRAWLER_BASE_URL}/get-chapter-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
        signal: contentAbortController.signal
      });
      const data = await res.json();
      if (data.success) {
        loadedChapterUrl.current = targetUrl;
        setParagraphs(data.paragraphs || []);
        setContentSource(data.source === "db" ? "db" : "crawler");
        setLoading(false);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadedChapterUrl.current = null;
    if (chapterUrl) { fetchContent(chapterUrl); stopAudio(); }
  }, [chapterUrl, fetchContent]);

  // If localStorage doesn't contain chapters for this book, try fetching them from the backend
  useEffect(() => {
    const tryFetchChapters = async () => {
      if (typeof window === 'undefined') return;
      try {
        const raw = localStorage.getItem(`chapters_${slug}`);
        if (raw) return;
        if (!slug) return;

        // Fetch book to get source_url
        const bookRes = await authFetch(`${CRAWLER_BASE_URL}/books?slug=${encodeURIComponent(slug)}`);
        const bookJson = await bookRes.json();
        if (!bookJson?.success || !bookJson?.data || bookJson.data.length === 0) return;
        const source = bookJson.data[0].source_url;
        if (!source) return;

        const chRes = await authFetch(`${CRAWLER_BASE_URL}/chapters?book=${encodeURIComponent(source)}`);
        const chJson = await chRes.json();
        if (chJson?.success && Array.isArray(chJson.data)) {
          syncChapterTitle(chJson.data);
          try { localStorage.setItem(`chapters_${slug}`, JSON.stringify(chJson.data)); } catch {}
        }
      } catch {
        // ignore
      }
    };
    tryFetchChapters();
  }, [slug, syncChapterTitle]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(`chapters_${slug}`);
      if (raw) {
        const list = JSON.parse(raw || "[]");
        syncChapterTitle(list);
      }
    } catch {
      // ignore and keep the empty title until chapter metadata arrives
    }
  }, [slug, chapterSlug, syncChapterTitle]);

  const fetchAudioBlob = (index: number): Promise<void> => {
    if (index >= paragraphs.length || index < 0 || blobCache.current[index]) return Promise.resolve();

    const existingTask = loadingTasks.current.get(index);
    if (existingTask) return existingTask.promise;

    const cacheVersion = audioCacheVersion.current;
    const task = { promise: Promise.resolve(), controller: new AbortController() };
    task.promise = (async () => {
      try {
        const text = encodeURIComponent(paragraphs[index]);
        const backendRate = getBackendRate(speedRef.current, voiceRef.current);
        const response = await authFetch(`${CRAWLER_BASE_URL}/stream-chapter-audio?text=${text}&rate=${encodeURIComponent(backendRate)}&voice=${voiceRef.current}`, {
          signal: task.controller.signal,
        });
        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(`Audio request failed for paragraph ${index}: ${response.status} ${errText.slice(0, 200)}`);
        }
        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error(`Empty audio blob for paragraph ${index}`);
        }
        if (cacheVersion === audioCacheVersion.current) {
          blobCache.current[index] = URL.createObjectURL(blob);
        }
      } catch (e) {
        if (!task.controller.signal.aborted) console.error(e);
        if (cacheVersion === audioCacheVersion.current) {
          delete blobCache.current[index];
        }
      } finally {
        if (loadingTasks.current.get(index)?.promise === task.promise) {
          loadingTasks.current.delete(index);
        }
      }
    })();
    loadingTasks.current.set(index, task);
    return task.promise;
  };

  const clearAutoPlayRequest = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (!nextParams.has("autoplay")) return;
    nextParams.delete("autoplay");
    const query = nextParams.toString();
    router.replace(`${window.location.pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const playParagraph = async (index: number): Promise<boolean> => {
    if (index >= paragraphs.length) { handleNavigate("next"); return false; }
    const audio = audioRef.current;
    if (!audio || index < 0) { stopAudio(); return false; }

    const session = ++playbackSession.current;
    setAutoPlayBlocked(false);
    const cachedAudioUrl = blobCache.current[index];
    audio.pause();
    audio.onended = null;
    audio.src = "";
    if (playingBlobUrl.current && playingBlobUrl.current !== cachedAudioUrl) {
      URL.revokeObjectURL(playingBlobUrl.current);
      playingBlobUrl.current = null;
    }
    setActiveIndex(index);
    setIsPlaying(true);
    document.getElementById(`para-${index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (!cachedAudioUrl) loadingTasks.current.get(index)?.controller.abort();

    const audioUrl = cachedAudioUrl || `${CRAWLER_BASE_URL}/stream-chapter-audio?${new URLSearchParams({
      text: paragraphs[index],
      rate: getBackendRate(speedRef.current, voiceRef.current),
      voice: voiceRef.current,
    }).toString()}`;
    playingBlobUrl.current = cachedAudioUrl || null;
    audio.src = audioUrl;
    audio.onended = async () => {
      if (session !== playbackSession.current) return;
      const nextIndex = index + 1;
      if (nextIndex < paragraphs.length) {
        void playParagraph(nextIndex);
        return;
      }
      if (playingBlobUrl.current) {
        URL.revokeObjectURL(playingBlobUrl.current);
        playingBlobUrl.current = null;
      }
      if (!handleNavigate("next", true)) {
        setIsPlaying(false);
        setActiveIndex(-1);
      }
    };

    for (let i = 1; i <= 3; i++) fetchAudioBlob(index + i);

    try {
      await audio.play();
      if (session === playbackSession.current) {
        clearAutoPlayRequest();
        return true;
      }
      return false;
    } catch (error) {
      if (session === playbackSession.current) {
        console.warn("Chapter audio playback was blocked or failed", error);
        audio.pause();
        audio.onended = null;
        audio.src = "";
        if (playingBlobUrl.current) {
          URL.revokeObjectURL(playingBlobUrl.current);
          playingBlobUrl.current = null;
        }
        setIsPlaying(false);
        setActiveIndex(-1);
      }
      return false;
    }
  };
  playParagraphRef.current = playParagraph;

  useEffect(() => {
    if (!autoPlayRequested) {
      autoPlayHandled.current = false;
      return;
    }
    if (autoPlayHandled.current || loading || !chapterUrl || !paragraphs.length || loadedChapterUrl.current !== chapterUrl) return;

    autoPlayHandled.current = true;
    void playParagraphRef.current(0).then((started) => {
      setAutoPlayBlocked(!started);
    });
  }, [autoPlayRequested, chapterUrl, loading, paragraphs, router, searchParams]);

  const stopAudio = () => {
    playbackSession.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.src = "";
    }
    if (playingBlobUrl.current) {
      URL.revokeObjectURL(playingBlobUrl.current);
      playingBlobUrl.current = null;
    }
    setIsPlaying(false);
    setActiveIndex(-1);
    setAutoPlayBlocked(false);
  };

  const resumeAutoPlay = async () => {
    autoPlayHandled.current = true;
    const started = await playParagraphRef.current(0);
    setAutoPlayBlocked(!started);
  };

  const saveAudioSettings = () => {
    const restartCurrentParagraph = isPlaying && activeIndex >= 0;
    speedRef.current = draftSpeed;
    voiceRef.current = draftVoice;
    setSpeed(draftSpeed);
    setVoice(draftVoice);
    clearBlobCache(true);

    if (restartCurrentParagraph) {
      void playParagraph(activeIndex);
    }
    setActiveMenu("none");
  };

  const handleNavigate = (direction: "next" | "prev", autoplay = false) => {
    const savedChapters = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "[]") as Chapter[];
    const currentIndex = savedChapters.findIndex((c) => c.slug === chapterSlug);
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < savedChapters.length) {
      stopAudio();
      setLoading(true);
      setParagraphs([]);
      const targetChapter = savedChapters[targetIndex];
      const nextParams = new URLSearchParams({ url: targetChapter.url });
      if (autoplay) nextParams.set("autoplay", "1");
      router.push(`/book/${slug}/${targetChapter.slug}?${nextParams.toString()}`);
      return true;
    }
    return false;
  };

  const draftSpeedBounds = getSpeedBounds(draftVoice);

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex flex-col font-sans">
      <div className="w-full max-w-7xl mx-auto px-4 overflow-x-hidden">
        <Navbar />
      </div>

      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-zinc-900 px-4 py-3 md:py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push(`/book/${slug}`)}
              className="text-zinc-600 hover:text-orange-500 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} className="md:w-5 md:h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] md:text-[10px] font-black text-orange-500 uppercase tracking-tighter italic truncate font-mono">
                Reading Mode
              </span>
              <h2 className="text-sm md:text-lg font-black text-zinc-100 uppercase italic leading-tight mt-0.5 font-mono truncate">
                {displayedChapterTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveMenu(activeMenu === "audio" ? "none" : "audio")}
              className={`p-2 md:p-2.5 rounded-lg transition-all ${activeMenu === "audio" ? "bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800"}`}
            >
              <Headphones size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
            <button
              onClick={() => setActiveMenu(activeMenu === "style" ? "none" : "style")}
              className={`p-2 md:p-2.5 rounded-lg transition-all ${activeMenu === "style" ? "bg-zinc-700 text-white" : "bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800"}`}
            >
              <Settings size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto overflow-hidden">
          {activeMenu === "audio" && (
            <div className="mt-3 p-3 md:p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center justify-center animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-6">
                <button onClick={() => playParagraph(activeIndex - 1)} className="text-zinc-500 hover:text-white"><SkipBack size={20} /></button>
                <button
                  onClick={() => isPlaying ? stopAudio() : playParagraph(activeIndex === -1 ? 0 : activeIndex)}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-orange-600 text-black hover:scale-105 transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                >
                  {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button onClick={() => playParagraph(activeIndex + 1)} className="text-zinc-500 hover:text-white"><SkipForward size={20} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeMenu === "style" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-4 sm:py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveMenu("none");
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reader-settings-title"
            className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl sm:my-0 sm:max-h-[calc(100dvh-3rem)] sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 id="reader-settings-title" className="text-base font-bold text-white">Cài đặt đọc</h2>
              <button
                type="button"
                aria-label="Đóng cài đặt"
                onClick={() => setActiveMenu("none")}
                className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-5 font-mono">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Cỡ chữ</span>
                <div className="flex items-center rounded-lg border border-zinc-800 bg-black p-1">
                  <button onClick={() => setFontSize(f => Math.max(12, f - 1))} className="rounded-md px-4 py-1 text-lg font-black text-orange-500 transition-colors hover:bg-zinc-900">-</button>
                  <span className="px-4 text-sm text-white">{fontSize}</span>
                  <button onClick={() => setFontSize(f => Math.min(35, f + 1))} className="rounded-md px-4 py-1 text-lg font-black text-orange-500 transition-colors hover:bg-zinc-900">+</button>
                </div>
              </div>

              <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <span className="flex items-center gap-2"><Gauge size={13} className="text-orange-500" />Tốc độ đọc</span>
                <span className="flex items-center gap-3">
                  <input
                    type="range"
                    min={draftSpeedBounds.min}
                    max={draftSpeedBounds.max}
                    step="1"
                    value={Number.parseInt(draftSpeed, 10)}
                    onChange={(e) => {
                      const percent = Number(e.target.value);
                      setDraftSpeed(`${percent > 0 ? "+" : ""}${percent}%`);
                    }}
                    className="w-full cursor-pointer accent-orange-500"
                  />
                  <span className="min-w-12 text-right normal-case">{draftSpeed}</span>
                </span>
              </label>

              <label className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <span className="flex items-center gap-2"><User size={13} className="text-orange-500" />Giọng đọc</span>
                <select
                  value={draftVoice}
                  onChange={(e) => {
                    const nextVoice = e.target.value;
                    const nextBounds = getSpeedBounds(nextVoice);
                    const currentSpeed = Number.parseInt(draftSpeed, 10);
                    const nextPercent = Math.min(nextBounds.max, Math.max(nextBounds.min, currentSpeed));
                    setDraftVoice(nextVoice);
                    setDraftSpeed(`${nextPercent > 0 ? "+" : ""}${nextPercent}%`);
                  }}
                  className="w-full rounded-md border border-zinc-700 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500"
                >
                  <option value="vi-VN-NamMinhNeural">Nam Minh</option>
                  <option value="vi-VN-HoaiMyNeural">Hoài My</option>
                  <option value={NGHITTS_VOICE}>NghiTTS</option>
                </select>
              </label>

              <div className="flex justify-end border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={saveAudioSettings}
                  className="w-full rounded-md bg-orange-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-orange-400 sm:w-auto sm:py-2.5"
                >
                  Lưu cài đặt đọc
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <main ref={containerRef} className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-orange-600" size={32} />
            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.3em] animate-pulse italic font-mono">Accessing Database...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 md:mb-8 flex items-center justify-center">
              <div className={`inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-mono text-[9px] md:text-[10px] font-black uppercase tracking-wider ${
                contentSource === "db" 
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" 
                  : "bg-sky-500/10 border border-sky-500/30 text-sky-400"
              }`}>
                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${contentSource === "db" ? "bg-emerald-400 animate-pulse" : "bg-sky-400 animate-pulse"}`} />
                {contentSource === "db" ? "Đang đọc từ database" : "Đang đọc từ nguồn crawl"}
              </div>
            </div>
            <article className="space-y-8 md:space-y-12 pb-32 md:pb-40">
              {paragraphs.map((para, idx) => (
              <p
                key={idx} id={`para-${idx}`} onClick={() => playParagraph(idx)}
                style={{ fontSize: `${fontSize}px` }}
                className={`leading-[1.9] md:leading-[2.1] text-justify transition-all duration-300 cursor-pointer p-2 rounded-lg border border-transparent font-['Segoe_UI','Roboto','Helvetica_Neue','Arial',sans-serif]
                  ${idx === activeIndex
                    ? "text-yellow-400 font-medium bg-yellow-500/5 border-yellow-500/10 shadow-[0_0_30px_rgba(250,204,21,0.08)]"
                    : isPlaying ? "text-white" : "text-zinc-300 hover:text-white"
                  }`}
              >
                {para}
              </p>
            ))}
          </article>
          </>
        )}
      </main>

      {autoPlayBlocked && !loading && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 px-3 sm:bottom-20 sm:px-4">
          <div role="status" className="mx-auto flex max-w-xl flex-col gap-3 rounded-lg border border-orange-500/40 bg-zinc-950/95 p-3 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <p className="text-xs text-zinc-200">Trình duyệt đã chặn tự phát chương tiếp theo.</p>
            <button
              type="button"
              onClick={() => void resumeAutoPlay()}
              className="w-full rounded-md bg-orange-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400 sm:w-auto"
            >
              Tiếp tục nghe
            </button>
          </div>
        </div>
      )}

      {/* FOOTER NAVIGATION - ĐÃ TINH CHỈNH THEO YÊU CẦU */}
      {!loading && (
        <footer className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-zinc-900 p-2 md:p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-2 md:px-10">
            {/* Nút "Trước" - Gọn gàng và cách đều */}
            <button
              onClick={() => handleNavigate("prev")}
              className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-black text-zinc-500 hover:text-orange-500 transition-all uppercase italic tracking-tighter font-mono py-2 px-1 md:px-3 rounded-lg hover:bg-zinc-900/50"
            >
              <ArrowLeft size={14} className="md:w-4 md:h-4 flex-shrink-0" />
              <span>Chương trước</span>
            </button>

            {/* Nút "Sau" - Đồng bộ màu, gọn gàng và cách đều */}
            <button
              onClick={() => handleNavigate("next")}
              className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-black text-zinc-500 hover:text-orange-500 transition-all uppercase italic tracking-tighter font-mono py-2 px-2 md:px-3 rounded-lg hover:bg-zinc-900/50"
            >
              <span>Chương sau</span>
              <ArrowRight size={14} className="md:w-4 md:h-4 flex-shrink-0" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}