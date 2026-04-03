"use client";
import React, { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface ChapterListProps {
  chapters: any[];
  onSelectChapter: (chapter: any) => void;
}

export const ChapterList = ({ chapters, onSelectChapter }: ChapterListProps) => {
  const [isAscending, setIsAscending] = useState(false);

  const parseChapterNum = (title: string) => {
    const m = title.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[0]) : 0;
  };

  const sortedChapters = useMemo(() => {
    const list = [...chapters];
    list.sort((a, b) => {
      const na = parseChapterNum(a.title_vi || "");
      const nb = parseChapterNum(b.title_vi || "");
      return isAscending ? na - nb : nb - na;
    });
    return list;
  }, [chapters, isAscending]);

  return (
    <div className="mt-12 w-full">
      <div className="flex justify-between items-end mb-6 border-l-4 border-orange-600 pl-4">
        <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Danh sách chương</h3>
        <button 
          onClick={() => setIsAscending(!isAscending)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-md text-[11px] text-gray-400 hover:text-orange-500 transition-all uppercase font-medium"
        >
          <ArrowUpDown size={14} />
          {isAscending ? 'Cũ nhất' : 'Mới nhất'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 h-[600px] overflow-y-auto pr-4 custom-scrollbar">
        {sortedChapters.map((ch, index) => (
          <button 
            // Dùng slug làm key sẽ ổn định hơn index khi danh sách thay đổi
            key={ch.slug || index} 
            onClick={() => onSelectChapter(ch)}
            className="group flex items-center p-4 bg-gray-950/50 border border-gray-800 rounded-lg hover:border-orange-500/50 hover:bg-gray-900 transition-all text-left"
          >
            <span className="text-[13px] text-gray-300 group-hover:text-white font-sans font-medium antialiased tracking-tight truncate">
              {ch.title_vi}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};