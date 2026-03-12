"use client";
import { useEffect, useState } from "react";
import { X, ArrowLeft, ArrowRight, Settings, Loader2 } from "lucide-react";

interface ReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle: string;
  chapterUrl: string;
}

export default function ReaderModal({ isOpen, onClose, chapterTitle, chapterUrl }: ReaderModalProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(18); // Cỡ chữ mặc định

  useEffect(() => {
    if (isOpen && chapterUrl) {
      fetchContent();
    }
  }, [isOpen, chapterUrl]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/get-chapter-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: chapterUrl })
      });
      const data = await res.json();
      if (data.success) {
        // Backend trả về HTML (đã thay \n bằng <br/>)
        setContent(data.content_html);
      }
    } catch (err) {
      console.error("Lỗi lấy nội dung:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#111] text-gray-200">
      {/* 1. Header cố định */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <X size={24} />
          </button>
          <h2 className="text-sm md:text-base font-bold text-orange-500 truncate max-w-[200px] md:max-w-md">
            {chapterTitle}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Nút chỉnh cỡ chữ nhanh */}
          <button onClick={() => setFontSize(f => f - 1)} className="px-3 py-1 bg-gray-800 rounded text-xs">-A</button>
          <button onClick={() => setFontSize(f => f + 1)} className="px-3 py-1 bg-gray-800 rounded text-xs">+A</button>
          <button className="p-2 hover:bg-gray-800 rounded-full"><Settings size={20} /></button>
        </div>
      </div>

      {/* 2. Nội dung đọc (Scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#121212]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="animate-spin text-orange-500" size={40} />
              <p className="text-gray-500 italic animate-pulse text-sm font-mono">Đang giải mã nội dung từ 69shuba...</p>
            </div>
          ) : (
            <div 
              style={{ fontSize: `${fontSize}px` }}
              className="leading-[1.8] font-serif space-y-6 text-justify selection:bg-orange-500/30"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}

          {/* 3. Footer điều hướng cuối trang */}
          {!loading && content && (
            <div className="mt-20 flex justify-between items-center border-t border-gray-800 pt-8 pb-12">
              <button className="flex items-center gap-2 px-6 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg text-sm transition-all">
                <ArrowLeft size={16} /> Chương trước
              </button>
              <button className="flex items-center gap-2 px-8 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-bold transition-all text-white">
                Chương sau <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
