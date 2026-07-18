"use client";
import React from 'react';
import { ArrowUpDown } from 'lucide-react';

interface ChapterListProps {
  chapters: any[];
  onSelectChapter: (chapter: any) => void;
}

export const ChapterList = ({ chapters, onSelectChapter }: ChapterListProps) => {
  // Render chapters in the order provided by the server (no client-side sorting)
  const sortedChapters = [...chapters];

  return (
    <div className="mt-12 w-full">
      <div className="flex justify-between items-end mb-6 border-l-4 border-orange-600 pl-4">
        <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Danh sách chương</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 h-[600px] overflow-y-auto pr-4 custom-scrollbar">
        {sortedChapters.map((ch, index) => {
          const access = String(ch.access || "regular").trim().toLowerCase();

          return (
            <button 
              key={ch.slug || index} 
              onClick={() => onSelectChapter(ch)}
              className="group flex items-center justify-between p-4 bg-gray-950/50 border border-gray-800 rounded-lg hover:border-orange-500/50 hover:bg-gray-900 transition-all text-left"
            >
              <span className="text-[13px] text-gray-300 group-hover:text-white font-sans font-medium antialiased tracking-tight truncate">
                {ch.title_vi || ch.title || "Chương không xác định"}
              </span>
              {access === "vip" ? (
                <span className="ml-3 rounded-full bg-red-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white">
                  VIP
                </span>
              ) : access === "unvip" ? (
                <span className="ml-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white">
                  UNVIP
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};