"use client";

import React, { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react'; // Cài đặt lucide-react nếu chưa có

interface ChapterListProps {
  chapters: any[];
  onSelectChapter: (title: string, url: string) => void;
}

export const ChapterList = ({ chapters, onSelectChapter }: ChapterListProps) => {
  // State quản lý hướng sắp xếp: true là cũ nhất (tăng dần), false là mới nhất (giảm dần)
  const [isAscending, setIsAscending] = useState(false);

  const getCleanTitle = (title: string) => {
    if (!title) return "";
    const regex = /^(Chương\s+\d+)[:\s-]*\d*[:\s-]*(.*)$/i;
    const match = title.match(regex);

    if (match) {
      const prefix = match[1];
      let content = match[2].trim();
      if (content) {
        content = content.charAt(0).toUpperCase() + content.slice(1);
        return `${prefix}: ${content}`; 
      }
      return prefix;
    }
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  // helper để trích số chương từ tiêu đề (ví dụ "Chương 12: ..." hoặc "12")
  const parseChapterNum = (title: string) => {
    if (!title) return 0;
    const m = title.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[0]) : 0;
  };

  // Sử dụng useMemo để tối ưu việc sắp xếp, tránh render lại không cần thiết
  const sortedChapters = useMemo(() => {
    const list = [...chapters]; // Tạo bản sao để tránh thay đổi props gốc
    list.sort((a, b) => {
      const na = parseChapterNum(a.title_vi || "");
      const nb = parseChapterNum(b.title_vi || "");
      if (na === nb) return 0;
      // nếu isAscending=true thì cũ -> mới, tức số nhỏ trước
      return isAscending ? na - nb : nb - na;
    });
    return list;
  }, [chapters, isAscending]);

  return (
    <div className="mt-12 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex justify-between items-end mb-6 border-l-4 border-orange-600 pl-4">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
            Danh sách chương
          </h3>
          <span className="text-[10px] text-gray-500 font-mono italic">
            Tổng: {chapters.length} chương
          </span>
        </div>

        {/* Nút Sắp xếp */}
        <button 
          onClick={() => setIsAscending(!isAscending)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-md text-[11px] text-gray-400 hover:text-orange-500 hover:border-orange-500/50 transition-all uppercase tracking-widest font-bold"
        >
          <ArrowUpDown size={14} />
          {isAscending ? 'Cũ nhất' : 'Mới nhất'}
        </button>
      </div>
      
      {/* Grid danh sách chương */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 h-[600px] overflow-y-auto pr-4 custom-scrollbar">
        {sortedChapters.map((ch, index) => {
          const displayTitle = getCleanTitle(ch.title_vi);
          
          return (
            <button 
              key={index}
              onClick={() => onSelectChapter(ch.title_vi, ch.url)}
              className="group flex items-center p-4 bg-gray-950/50 border border-gray-800 rounded-lg hover:border-orange-500/50 hover:bg-gray-900 transition-all text-left w-full"
            >
              <span className="text-[13px] text-gray-300 group-hover:text-white font-serif italic leading-tight truncate">
                {displayTitle}
              </span>
            </button>
          );
        })}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ea580c; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #fb923c; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #ea580c transparent; }
      `}</style>
    </div>
  );
};
