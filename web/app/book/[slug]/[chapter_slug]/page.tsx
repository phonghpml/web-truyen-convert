"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Settings, Loader2, Headphones,
  Square, SkipForward, SkipBack, Gauge, User
} from "lucide-react";
import { CRAWLER_BASE_URL } from "@/lib/constants";
import { Navbar } from "@/components/layout/Navbar";

let contentAbortController: AbortController | null = null;

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const chapterSlug = params.chapter_slug as string;
  const chapterUrl = searchParams.get("url");

  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [speed, setSpeed] = useState("+0%");
  const [voice, setVoice] = useState("vi-VN-NamMinhNeural");
  const [activeMenu, setActiveMenu] = useState<"none" | "audio" | "style">("none");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobCache = useRef<{ [key: number]: string }>({});
  const loadingTasks = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") audioRef.current = new Audio();
    return () => {
      stopAudio();
      clearBlobCache();
      if (contentAbortController) contentAbortController.abort();
    };
  }, []);

  const clearBlobCache = () => {
    Object.values(blobCache.current).forEach(url => URL.revokeObjectURL(url));
    blobCache.current = {};
    loadingTasks.current.clear();
  };

  const fetchContent = useCallback(async (targetUrl: string) => {
    if (contentAbortController) contentAbortController.abort();
    contentAbortController = new AbortController();
    setLoading(true);
    clearBlobCache();
    try {
      const res = await fetch(`${CRAWLER_BASE_URL}/get-chapter-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
        signal: contentAbortController.signal
      });
      const data = await res.json();
      if (data.success) {
        setParagraphs(data.paragraphs);
        setLoading(false);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (chapterUrl) { fetchContent(chapterUrl); stopAudio(); }
  }, [chapterUrl, fetchContent]);

  const fetchAudioBlob = async (index: number) => {
    if (index >= paragraphs.length || index < 0 || blobCache.current[index] || loadingTasks.current.has(index)) return;
    loadingTasks.current.add(index);
    try {
      const text = encodeURIComponent(paragraphs[index]);
      const response = await fetch(`${CRAWLER_BASE_URL}/stream-chapter-audio?text=${text}&rate=${encodeURIComponent(speed)}&voice=${voice}`);
      const blob = await response.blob();
      blobCache.current[index] = URL.createObjectURL(blob);
    } catch (e) { console.error(e); }
    finally { loadingTasks.current.delete(index); }
  };

  const playParagraph = async (index: number) => {
    if (index >= paragraphs.length) { handleNavigate("next"); return; }
    if (!audioRef.current || index < 0) { stopAudio(); return; }
    setActiveIndex(index);
    setIsPlaying(true);
    document.getElementById(`para-${index}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!blobCache.current[index]) await fetchAudioBlob(index);
    const audioUrl = blobCache.current[index];
    if (audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(() => setIsPlaying(false));
      for (let i = 1; i <= 3; i++) fetchAudioBlob(index + i);
    }
    audioRef.current.onended = () => playParagraph(index + 1);
  };

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsPlaying(false);
    setActiveIndex(-1);
  };

  const handleNavigate = (direction: "next" | "prev") => {
    const savedChapters = JSON.parse(localStorage.getItem(`chapters_${slug}`) || "[]");
    const currentIndex = savedChapters.findIndex((c: any) => c.slug === chapterSlug);
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < savedChapters.length) {
      stopAudio();
      setLoading(true);
      setParagraphs([]);
      const targetChapter = savedChapters[targetIndex];
      router.push(`/book/${slug}/${targetChapter.slug}?url=${encodeURIComponent(targetChapter.url)}`);
    }
  };

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
                {chapterSlug.replace(/-/g, ' ')}
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
            <div className="mt-3 p-3 md:p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-6">
                <button onClick={() => playParagraph(activeIndex - 1)} className="text-zinc-500 hover:text-white"><SkipBack size={20} /></button>
                <button
                  onClick={() => isPlaying ? stopAudio() : playParagraph(activeIndex === -1 ? 0 : activeIndex)}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-orange-600 text-black hover:scale-105 transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                >
                  {isPlaying ? <Square size={14} fill="currentColor" /> : <Headphones size={16} />}
                </button>
                <button onClick={() => playParagraph(activeIndex + 1)} className="text-zinc-500 hover:text-white"><SkipForward size={20} /></button>
              </div>
              <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono w-full md:w-auto justify-center">
                <div className="flex items-center gap-2 border-r border-zinc-800 pr-5">
                  <Gauge size={12} className="text-orange-500" />
                  <select value={speed} onChange={(e) => { setSpeed(e.target.value); clearBlobCache(); }} className="bg-transparent outline-none cursor-pointer">
                    <option value="-20%">Slow</option>
                    <option value="+0%">Normal</option>
                    <option value="+20%">Fast</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <User size={12} className="text-orange-500" />
                  <select value={voice} onChange={(e) => { setVoice(e.target.value); clearBlobCache(); }} className="bg-transparent outline-none cursor-pointer">
                    <option value="vi-VN-NamMinhNeural">Male</option>
                    <option value="vi-VN-HoaiMyNeural">Female</option>
                    <option value="vi-VN-AnNeural">An (Child)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          {activeMenu === "style" && (
            <div className="mt-3 p-3 md:p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center justify-center gap-4 md:gap-6 animate-in fade-in slide-in-from-top-2 font-mono">
              <span className="text-[10px] md:text-[11px] font-black text-zinc-500 uppercase italic tracking-widest">Font Size</span>
              <div className="flex items-center bg-black border border-zinc-800 rounded-lg p-1">
                <button onClick={() => setFontSize(f => Math.max(12, f - 1))} className="px-3 md:px-4 py-1 text-orange-500 font-black hover:bg-zinc-900 rounded-md transition-colors text-lg">-</button>
                <span className="px-4 text-sm md:text-base text-white">{fontSize}</span>
                <button onClick={() => setFontSize(f => Math.min(35, f + 1))} className="px-3 md:px-4 py-1 text-orange-500 font-black hover:bg-zinc-900 rounded-md transition-colors text-lg">+</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <main ref={containerRef} className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-orange-600" size={32} />
            <p className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.3em] animate-pulse italic font-mono">Accessing Database...</p>
          </div>
        ) : (
          <article className="space-y-8 md:space-y-12 pb-32 md:pb-40">
            {paragraphs.map((para, idx) => (
              <p
                key={idx} id={`para-${idx}`} onClick={() => playParagraph(idx)}
                style={{ fontSize: `${fontSize}px` }}
                className={`leading-[1.8] md:leading-[2.0] font-serif text-justify transition-all duration-300 cursor-pointer p-2 rounded-lg border border-transparent 
                  ${idx === activeIndex
                    ? "text-orange-400 font-medium bg-orange-500/5 border-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.08)]"
                    : isPlaying ? "text-zinc-700 opacity-30" : "text-zinc-300 hover:text-white"
                  }`}
              >
                {para}
              </p>
            ))}
          </article>
        )}
      </main>

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