"use client";
import { useEffect, useState, useRef } from "react";
import { X, ArrowLeft, ArrowRight, Settings, Loader2, Headphones, Square, SkipForward, SkipBack, Gauge, User, Type } from "lucide-react";
import { CRAWLER_BASE_URL } from "@/lib/constants";

interface ReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  chapterUrl: string;
  chapterSlug?: string;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
}

export default function ReaderModal({ 
  isOpen, 
  onClose, 
  chapterTitle, 
  chapterUrl,
  chapterSlug,
  onNextChapter, 
  onPrevChapter 
}: ReaderModalProps) {
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const [speed, setSpeed] = useState("+0%"); 
  const [voice, setVoice] = useState("vi-VN-NamMinhNeural"); 
  
  // State điều khiển các menu con
  const [activeMenu, setActiveMenu] = useState<"none" | "audio" | "style">("none");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobCache = useRef<{ [key: number]: string }>({});
  const loadingTasks = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
    }
    return () => { stopAudio(); clearBlobCache(); };
  }, []);

  useEffect(() => {
    if (isOpen && chapterUrl) { fetchContent(); stopAudio(); }
  }, [isOpen, chapterUrl]);

  const clearBlobCache = () => {
    Object.values(blobCache.current).forEach(url => URL.revokeObjectURL(url));
    blobCache.current = {};
    loadingTasks.current.clear();
  };

  const fetchContent = async () => {
    setLoading(true);
    clearBlobCache();
    try {
      const res = await fetch(`${CRAWLER_BASE_URL}/get-chapter-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: chapterUrl })
      });
      const data = await res.json();
      if (data.success) setParagraphs(data.paragraphs);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const fetchAudioBlob = async (index: number) => {
    if (index >= paragraphs.length || index < 0 || blobCache.current[index] || loadingTasks.current.has(index)) return;
    loadingTasks.current.add(index);
    try {
      const text = encodeURIComponent(paragraphs[index]);
      const safeSpeed = encodeURIComponent(speed);
      const response = await fetch(`${CRAWLER_BASE_URL}/stream-chapter-audio?text=${text}&rate=${safeSpeed}&voice=${voice}`);
      const blob = await response.blob();
      blobCache.current[index] = URL.createObjectURL(blob);
    } catch (e) { console.error(e); } 
    finally { loadingTasks.current.delete(index); }
  };

  const playParagraph = async (index: number) => {
    if (index >= paragraphs.length) {
      if (onNextChapter) onNextChapter();
      else stopAudio();
      return;
    }
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

    audioRef.current.onended = () => {
      if (blobCache.current[index - 2]) {
        URL.revokeObjectURL(blobCache.current[index - 2]);
        delete blobCache.current[index - 2];
      }
      playParagraph(index + 1);
    };
  };

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsPlaying(false);
    setActiveIndex(-1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#111] text-gray-200">
      {/* 1. Header chính tối giản */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#1a1a1a] z-10 shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => { stopAudio(); onClose(); }} className="p-2 hover:bg-gray-800 rounded-full transition-colors"><X size={24} /></button>
          <h2 className="text-sm md:text-base font-bold text-orange-500 truncate max-w-[120px] md:max-w-md">{chapterTitle}</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Nút Mở Menu Nghe */}
          <button 
            onClick={() => setActiveMenu(activeMenu === "audio" ? "none" : "audio")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${activeMenu === "audio" ? "bg-orange-500 text-black border-orange-500" : "bg-orange-500/10 text-orange-500 border-orange-500/30"}`}
          >
            <Headphones size={16} />
            <span className="hidden md:inline">Nghe</span>
          </button>

          {/* Nút Mở Menu Cài đặt */}
          <button 
            onClick={() => setActiveMenu(activeMenu === "style" ? "none" : "style")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${activeMenu === "style" ? "bg-gray-700 text-white border-gray-600" : "bg-gray-800/50 text-gray-400 border-gray-700"}`}
          >
            <Settings size={16} />
            <span className="hidden md:inline">Cài đặt</span>
          </button>
        </div>
      </div>

      {/* 2. Menu Nghe Truyện (Hiện khi bấm Nghe) */}
      {activeMenu === "audio" && (
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 px-6 py-4 bg-[#1e1e1e] border-b border-gray-800 animate-in slide-in-from-top duration-300 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => playParagraph(activeIndex - 1)} className="p-2 hover:text-orange-500 transition-colors"><SkipBack size={20} /></button>
            <button 
              onClick={() => isPlaying ? stopAudio() : playParagraph(activeIndex === -1 ? 0 : activeIndex)} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-600 text-white shadow-lg shadow-orange-900/20"
            >
              {isPlaying ? <Square size={18} fill="currentColor" /> : <Headphones size={18} />}
            </button>
            <button onClick={() => playParagraph(activeIndex + 1)} className="p-2 hover:text-orange-500 transition-colors"><SkipForward size={20} /></button>
          </div>
          <div className="h-6 w-[1px] bg-gray-700 hidden md:block" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Gauge size={16} className="text-gray-500" />
              <select value={speed} onChange={(e) => { setSpeed(e.target.value); clearBlobCache(); if(isPlaying) playParagraph(activeIndex); }} className="bg-transparent text-xs outline-none border-b border-gray-700 pb-1 cursor-pointer">
                <option value="-20%">Chậm</option>
                <option value="+0%">Bình thường</option>
                <option value="+20%">Nhanh</option>
                <option value="+50%">Rất nhanh</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-500" />
              <select value={voice} onChange={(e) => { setVoice(e.target.value); clearBlobCache(); if(isPlaying) playParagraph(activeIndex); }} className="bg-transparent text-xs outline-none border-b border-gray-700 pb-1 cursor-pointer">
                <option value="vi-VN-NamMinhNeural">Giọng Nam</option>
                <option value="vi-VN-HoaiMyNeural">Giọng Nữ</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. Menu Cài đặt Chữ (Hiện khi bấm Cài đặt) */}
      {activeMenu === "style" && (
        <div className="flex items-center justify-center gap-6 px-6 py-4 bg-[#1e1e1e] border-b border-gray-800 animate-in slide-in-from-top duration-300 z-10">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Cỡ chữ:</span>
            <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-800 shadow-inner">
              <button onClick={() => setFontSize(f => Math.max(12, f - 1))} className="px-4 py-1 hover:bg-gray-800 rounded-md transition-colors text-orange-500 font-bold">- A</button>
              <span className="px-6 py-1 border-x border-gray-800 font-mono text-sm">{fontSize}</span>
              <button onClick={() => setFontSize(f => Math.min(35, f + 1))} className="px-4 py-1 hover:bg-gray-800 rounded-md transition-colors text-orange-500 font-bold">+ A</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Vùng nội dung truyện - GIỮ NGUYÊN CSS GỐC */}
      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212] pb-32">
        <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4"><Loader2 className="animate-spin text-orange-500" size={40} /><p className="text-gray-500 italic animate-pulse text-sm font-mono uppercase tracking-widest">Đang giải mã...</p></div>
          ) : (
            <div className="space-y-10">
              {paragraphs.map((para, idx) => (
                <p key={idx} id={`para-${idx}`} onClick={() => playParagraph(idx)} style={{ fontSize: `${fontSize}px` }} className={`leading-[1.9] font-serif text-justify transition-all duration-500 cursor-pointer p-2 rounded-lg border border-transparent ${idx === activeIndex ? "text-orange-400 font-medium scale-[1.02] bg-orange-500/[0.03] border-orange-500/10 shadow-sm" : isPlaying ? "text-gray-600 opacity-40 blur-[0.4px]" : "text-gray-300 hover:text-white"}`}>
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Thanh điều hướng ghim - GIỮ NGUYÊN CSS NÚT BẤM GỐC */}
      {!loading && paragraphs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800 px-4 md:px-6 py-4 flex justify-between items-center z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
          <button 
            onClick={onPrevChapter} 
            className="flex items-center gap-2 px-6 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg text-xs md:text-sm transition-all border border-gray-800"
          >
            <ArrowLeft size={16} /> 
            <span className="hidden md:inline">Chương trước</span>
          </button>
          
          <button 
            onClick={onNextChapter} 
            className="flex items-center gap-2 px-8 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-xs md:text-sm font-bold transition-all text-white shadow-lg"
          >
            <span className="hidden md:inline">Chương sau</span> 
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
